using Campus.Api.Data;
using Campus.Api.Dtos;
using Campus.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Campus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AttendanceController : ControllerBase
{
    private const int PersonCooldownMinutes = 5;   // same person, same camera
    private const int UnknownCooldownMinutes = 1;  // unknown/spoof at the same camera

    private static readonly TimeZoneInfo CampusTimeZone =
        TimeZoneInfo.FindSystemTimeZoneById("Africa/Cairo");

    private readonly CampusDbContext _db;

    public AttendanceController(CampusDbContext db)
    {
        _db = db;
    }

    // POST api/attendance/recognize   (called by the AI camera service)
    [HttpPost("recognize")]
    public async Task<ActionResult<RecognitionResponseDto>> Recognize(RecognitionRequestDto dto)
    {
        if (dto.Result == RecognitionResult.Denied)
            return BadRequest(new { message = "Result must be Recognized, Unknown or Spoof. The API decides Denied." });

        var camera = await _db.Cameras.FindAsync(dto.CameraId);
        if (camera is null)
            return NotFound(new { message = $"Camera {dto.CameraId} not found." });
        if (!camera.IsActive)
            return BadRequest(new { message = $"Camera '{camera.Name}' is not active." });

        var timestamp = ToUtc(dto.Timestamp) ?? DateTime.UtcNow;

        // 1. Find the person (only for Recognized)
        Person? person = null;
        if (dto.Result == RecognitionResult.Recognized)
        {
            if (dto.PersonId is null)
                return BadRequest(new { message = "PersonId is required when Result is Recognized." });

            person = await _db.Persons.FindAsync(dto.PersonId.Value);
            if (person is null)
                return NotFound(new { message = $"Person {dto.PersonId} not found." });
        }

        // 2. Ignore duplicates
        var recent = await FindRecentLog(person, camera.Id, dto.Result, timestamp);
        if (recent is not null)
        {
            return Ok(new RecognitionResponseDto
            {
                AttendanceLogId = recent.Id,
                Result = recent.Result,
                Allowed = recent.Result == RecognitionResult.Recognized,
                Duplicate = true,
                PersonId = person?.Id,
                PersonName = person?.FullName
            });
        }

        // 3. Decide the final result and whether to raise a warning
        var result = dto.Result;
        AlertType? alertType = null;
        string? alertMessage = null;

        if (result == RecognitionResult.Spoof)
        {
            alertType = AlertType.SpoofAttempt;
            alertMessage = $"Spoof attempt (photo or screen) detected at {camera.Name}.";
        }
        else if (result == RecognitionResult.Unknown)
        {
            alertType = AlertType.UnknownFace;
            alertMessage = $"Unknown person detected at {camera.Name}.";
        }
        else
        {
            var denied = await CheckAccess(person!, camera, timestamp);
            if (denied is not null)
            {
                result = RecognitionResult.Denied;
                alertType = denied.Value.Type;
                alertMessage = denied.Value.Message;
            }
        }

        // 4. Save the record (and the alert, if any)
        var log = new AttendanceLog
        {
            PersonId = person?.Id,
            CameraId = camera.Id,
            Timestamp = timestamp,
            Confidence = dto.Confidence,
            Result = result
        };
        _db.AttendanceLogs.Add(log);

        if (alertType is not null)
        {
            _db.Alerts.Add(new Alert
            {
                Type = alertType.Value,
                Message = alertMessage!,
                AttendanceLog = log
            });
        }

        await _db.SaveChangesAsync();

        return Ok(new RecognitionResponseDto
        {
            AttendanceLogId = log.Id,
            Result = result,
            Allowed = result == RecognitionResult.Recognized,
            Duplicate = false,
            PersonId = person?.Id,
            PersonName = person?.FullName,
            Alert = alertMessage
        });
    }

    // GET api/attendance?date=2026-10-20&cameraId=1&personId=1&result=Denied
    [HttpGet]
    public async Task<ActionResult<List<AttendanceLogDto>>> GetLogs(
        [FromQuery] DateOnly? date,
        [FromQuery] int? cameraId,
        [FromQuery] int? personId,
        [FromQuery] RecognitionResult? result)
    {
        var query = _db.AttendanceLogs.AsNoTracking().AsQueryable();

        if (date is not null)
        {
            // a "day" means a day in Cairo time, not UTC
            var startUtc = TimeZoneInfo.ConvertTimeToUtc(date.Value.ToDateTime(TimeOnly.MinValue), CampusTimeZone);
            var endUtc = startUtc.AddDays(1);
            query = query.Where(a => a.Timestamp >= startUtc && a.Timestamp < endUtc);
        }
        if (cameraId is not null)
            query = query.Where(a => a.CameraId == cameraId);
        if (personId is not null)
            query = query.Where(a => a.PersonId == personId);
        if (result is not null)
            query = query.Where(a => a.Result == result);

        var logs = await query
            .OrderByDescending(a => a.Timestamp)
            .Take(200)
            .Select(a => new AttendanceLogDto
            {
                Id = a.Id,
                Timestamp = a.Timestamp,
                PersonId = a.PersonId,
                PersonName = a.Person != null ? a.Person.FullName : null,
                PersonType = a.Person != null ? (PersonType?)a.Person.Type : null,
                CameraId = a.CameraId,
                CameraName = a.Camera.Name,
                Location = a.Camera.Location,
                Confidence = a.Confidence,
                Result = a.Result
            })
            .ToListAsync();

        return Ok(logs);
    }

    // ---------- helpers ----------

    private async Task<AttendanceLog?> FindRecentLog(
        Person? person, int cameraId, RecognitionResult result, DateTime timestamp)
    {
        if (person is not null)
        {
            var cutoff = timestamp.AddMinutes(-PersonCooldownMinutes);
            return await _db.AttendanceLogs
                .Where(a => a.PersonId == person.Id && a.CameraId == cameraId && a.Timestamp >= cutoff)
                .OrderByDescending(a => a.Timestamp)
                .FirstOrDefaultAsync();
        }
        else
        {
            var cutoff = timestamp.AddMinutes(-UnknownCooldownMinutes);
            return await _db.AttendanceLogs
                .Where(a => a.PersonId == null && a.CameraId == cameraId && a.Result == result && a.Timestamp >= cutoff)
                .OrderByDescending(a => a.Timestamp)
                .FirstOrDefaultAsync();
        }
    }

    // Returns null if allowed, or the reason if denied
    private async Task<(AlertType Type, string Message)?> CheckAccess(
        Person person, Camera camera, DateTime timestampUtc)
    {
        if (!person.IsActive)
            return (AlertType.AccessDenied, $"{person.FullName} is deactivated but was seen at {camera.Name}.");

        if (person.Type == PersonType.Visitor &&
            (person.VisitStart is null || person.VisitEnd is null ||
             timestampUtc < person.VisitStart || timestampUtc > person.VisitEnd))
            return (AlertType.ExpiredVisitor, $"Visitor {person.FullName} is outside their allowed visit time at {camera.Name}.");

        var rules = await _db.AccessRules.Where(r => r.CameraId == camera.Id).ToListAsync();
        if (rules.Count == 0)
            return null; // no rules for this camera = everyone allowed

        var localTime = TimeOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(timestampUtc, CampusTimeZone));
        var allowed = rules.Any(r => r.AllowedType == person.Type && localTime.IsBetween(r.StartTime, r.EndTime));
        if (allowed)
            return null;

        return (AlertType.AccessDenied,
            $"{person.FullName} ({person.Type}) is not allowed at {camera.Name} at {localTime:HH:mm}.");
    }

    private static DateTime? ToUtc(DateTime? value) =>
        value is null ? null :
        value.Value.Kind == DateTimeKind.Utc ? value : value.Value.ToUniversalTime();
}