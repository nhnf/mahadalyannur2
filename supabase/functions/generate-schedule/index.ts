import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Candidate = {
  curriculumId: string
  classroomId: string
  courseId: string
  lecturerId: string | null
  priorityWeight: number
  lecturerPriority: number
}

type AvailabilityMap = Record<string, string>

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function scoreCandidate(candidate: Candidate, availability: AvailabilityMap, slotKey: string) {
  const availabilityStatus = availability[slotKey] ?? 'available'
  const availabilityScore = availabilityStatus === 'preferred' ? 40 : availabilityStatus === 'available' ? 20 : -999
  return (candidate.priorityWeight * 10) + (candidate.lecturerPriority * 5) + availabilityScore
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Supabase environment variables are missing.' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const body = await req.json()
    const academicYearId = body.academic_year_id as string | undefined
    const runName = (body.run_name as string | undefined) ?? `Generate ${new Date().toISOString()}`

    if (!academicYearId) {
      return json({ error: 'academic_year_id is required.' }, 400)
    }

    const { data: authUser } = await supabase.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', '') ?? '')

    const { data: runRow, error: runError } = await supabase
      .from('schedule_runs')
      .insert({
        academic_year_id: academicYearId,
        name: runName,
        status: 'running',
        requested_by: authUser.user?.id ?? null,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (runError || !runRow) {
      throw runError ?? new Error('Unable to create schedule run.')
    }

    const scheduleRunId = runRow.id as string

    const [curriculumRes, assignmentsRes, slotsRes, availabilityRes, existingRes] = await Promise.all([
      supabase
        .from('class_curriculum')
        .select('id, classroom_id, course_id, priority_weight, required_meetings')
        .eq('academic_year_id', academicYearId)
        .is('deleted_at', null),
      supabase
        .from('course_assignments')
        .select('classroom_id, course_id, lecturer_id, is_primary, lecturers(priority_score)')
        .eq('academic_year_id', academicYearId)
        .is('deleted_at', null),
      supabase
        .from('time_slots')
        .select('id, code, day_id, session_number')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('session_number'),
      supabase
        .from('lecturer_availability')
        .select('lecturer_id, time_slot_id, status')
        .is('deleted_at', null),
      supabase
        .from('schedules')
        .select('id, classroom_id, lecturer_id, time_slot_id, is_locked')
        .eq('academic_year_id', academicYearId)
        .is('deleted_at', null),
    ])

    if (curriculumRes.error) throw curriculumRes.error
    if (assignmentsRes.error) throw assignmentsRes.error
    if (slotsRes.error) throw slotsRes.error
    if (availabilityRes.error) throw availabilityRes.error
    if (existingRes.error) throw existingRes.error

    const slots = slotsRes.data ?? []
    const lockedSchedules = (existingRes.data ?? []).filter((row) => row.is_locked)
    const existingLecturerSlots = new Set(
      (existingRes.data ?? [])
        .filter((row) => row.lecturer_id && row.time_slot_id)
        .map((row) => `${row.lecturer_id}:${row.time_slot_id}`),
    )
    const existingClassroomSlots = new Set(
      (existingRes.data ?? [])
        .filter((row) => row.classroom_id && row.time_slot_id)
        .map((row) => `${row.classroom_id}:${row.time_slot_id}`),
    )

    const assignmentMap = new Map<string, { lecturer_id: string | null; priority_score: number }>()
    for (const row of assignmentsRes.data ?? []) {
      const key = `${row.classroom_id}:${row.course_id}`
      if (!assignmentMap.has(key) || row.is_primary) {
        assignmentMap.set(key, {
          lecturer_id: row.lecturer_id,
          priority_score: Number((row as any).lecturers?.priority_score ?? 1),
        })
      }
    }

    const availabilityMap: Record<string, string> = {}
    for (const row of availabilityRes.data ?? []) {
      availabilityMap[`${row.lecturer_id}:${row.time_slot_id}`] = row.status
    }

    const candidates: Candidate[] = []
    for (const curriculum of curriculumRes.data ?? []) {
      const assignment = assignmentMap.get(`${curriculum.classroom_id}:${curriculum.course_id}`)
      for (let i = 0; i < Number(curriculum.required_meetings ?? 1); i += 1) {
        candidates.push({
          curriculumId: curriculum.id,
          classroomId: curriculum.classroom_id,
          courseId: curriculum.course_id,
          lecturerId: assignment?.lecturer_id ?? null,
          priorityWeight: Number(curriculum.priority_weight ?? 1),
          lecturerPriority: Number(assignment?.priority_score ?? 1),
        })
      }
    }

    candidates.sort((a, b) => (b.priorityWeight + b.lecturerPriority) - (a.priorityWeight + a.lecturerPriority))

    const insertRows: Record<string, unknown>[] = []
    const logRows: Record<string, unknown>[] = []

    for (const candidate of candidates) {
      let bestSlot: { id: string; score: number } | null = null

      for (const slot of slots) {
        const classroomKey = `${candidate.classroomId}:${slot.id}`
        const lecturerKey = `${candidate.lecturerId}:${slot.id}`
        const slotScore = scoreCandidate(candidate, availabilityMap, lecturerKey)

        if (existingClassroomSlots.has(classroomKey)) continue
        if (candidate.lecturerId && existingLecturerSlots.has(lecturerKey)) continue
        if (slotScore < 0) continue

        if (!bestSlot || slotScore > bestSlot.score) {
          bestSlot = { id: slot.id, score: slotScore }
        }
      }

      if (!bestSlot) {
        logRows.push({
          schedule_run_id: scheduleRunId,
          level: 'warning',
          code: 'NO_SLOT',
          message: 'Tidak ditemukan slot valid untuk kandidat jadwal.',
          context: {
            classroom_id: candidate.classroomId,
            course_id: candidate.courseId,
            lecturer_id: candidate.lecturerId,
            curriculum_id: candidate.curriculumId,
          },
        })
        continue
      }

      existingClassroomSlots.add(`${candidate.classroomId}:${bestSlot.id}`)
      if (candidate.lecturerId) existingLecturerSlots.add(`${candidate.lecturerId}:${bestSlot.id}`)

      insertRows.push({
        academic_year_id: academicYearId,
        classroom_id: candidate.classroomId,
        course_id: candidate.courseId,
        lecturer_id: candidate.lecturerId,
        time_slot_id: bestSlot.id,
        session_slot: 1,
        schedule_date: new Date().toISOString().slice(0, 10),
        status: 'pending',
        entry_status: 'draft',
        generated_by_run_id: scheduleRunId,
        notes: 'Auto-generated by SIMKURMA engine',
      })

      logRows.push({
        schedule_run_id: scheduleRunId,
        level: 'info',
        code: 'ASSIGNED',
        message: 'Kandidat jadwal berhasil ditempatkan.',
        context: {
          classroom_id: candidate.classroomId,
          course_id: candidate.courseId,
          lecturer_id: candidate.lecturerId,
          time_slot_id: bestSlot.id,
          score: bestSlot.score,
        },
      })
    }

    if (insertRows.length > 0) {
      const { error: insertError } = await supabase.from('schedules').insert(insertRows)
      if (insertError) throw insertError
    }

    if (logRows.length > 0) {
      const { error: logsError } = await supabase.from('schedule_run_logs').insert(logRows)
      if (logsError) throw logsError
    }

    const { error: finalizeError } = await supabase
      .from('schedule_runs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        total_candidates: candidates.length,
        total_assigned: insertRows.length,
        total_conflicts: logRows.filter((row) => row.code === 'NO_SLOT').length,
        summary: {
          locked_entries: lockedSchedules.length,
          generated_entries: insertRows.length,
          warnings: logRows.filter((row) => row.level === 'warning').length,
        },
      })
      .eq('id', scheduleRunId)

    if (finalizeError) throw finalizeError

    return json({
      schedule_run_id: scheduleRunId,
      generated_entries: insertRows.length,
      conflicts: logRows.filter((row) => row.code === 'NO_SLOT').length,
    })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500)
  }
})
