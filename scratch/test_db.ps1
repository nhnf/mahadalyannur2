$SUPABASE_URL = "https://unyfvjugdyrdirkdrifw.supabase.co"
$APIKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueWZ2anVnZHlyZGlya2RyaWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTM2MjMsImV4cCI6MjA5NTI4OTYyM30.J9694tJehud3vlWZccqcZVyb_xsHSjO9lyvN3twPPmw"
$headers = @{
    "apikey" = $APIKEY
    "Authorization" = "Bearer $APIKEY"
}

# Test key tables
$tables = @("schedule_slots", "v_schedule_per_classroom", "v_schedule_per_lecturer", "v_lecturer_workload", "v_unscheduled_courses", "schedule_run_logs", "schedules", "lecturers", "courses", "classrooms", "time_slots", "days", "semester_category_rules", "course_time_preferences", "lecturer_class_rules")

foreach ($t in $tables) {
    try {
        $url = "$SUPABASE_URL/rest/v1/$t" + "?select=*&limit=1"
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
        Write-Host "OK: $t - exists (returned $($response.Count) rows)"
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        Write-Host "ERR: $t - Status $statusCode"
    }
}
