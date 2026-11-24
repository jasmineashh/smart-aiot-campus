
using Campus.Api.Data;
using Campus.Api.Dtos;
using Campus.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Campus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
[AutoValidateAntiforgeryToken]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class AlertsController : ControllerBase
{
    private readonly CampusDbContext _db;

    public AlertsController(CampusDbContext db)
    {
        _db = db;
    }

    // GET api/alerts?resolved=false&type=UnknownFace
    [HttpGet]
    public async Task<ActionResult<List<AlertDto>>> GetAll(
        [FromQuery] bool? resolved,
        [FromQuery] AlertType? type)
    {
        var query = _db.Alerts
            .AsNoTracking()
            .AsQueryable();

        if (resolved is not null)
            query = query.Where(
                a => a.IsResolved == resolved);

        if (type is not null)
            query = query.Where(a => a.Type == type);

        var alerts = await query
            .OrderByDescending(a => a.CreatedAt)
            .Take(200)
            .Select(a => new AlertDto
            {
                Id = a.Id,
                Type = a.Type,
                Message = a.Message,
                CreatedAt = a.CreatedAt,
                IsResolved = a.IsResolved,
                AttendanceLogId = a.AttendanceLogId,
                CameraName = a.AttendanceLog.Camera.Name,
                PersonName = a.AttendanceLog.Person != null
                    ? a.AttendanceLog.Person.FullName
                    : null
            })
            .ToListAsync();

        return Ok(alerts);
    }

    // GET api/alerts/unresolved-count
    [HttpGet("unresolved-count")]
    public async Task<ActionResult<int>> UnresolvedCount()
    {
        return Ok(await _db.Alerts.CountAsync(
            a => !a.IsResolved));
    }

    // PUT api/alerts/1/resolve
    [HttpPut("{id:int}/resolve")]
    public async Task<IActionResult> Resolve(int id)
    {
        var alert = await _db.Alerts.FindAsync(id);

        if (alert is null)
            return NotFound(new
            {
                message = $"Alert {id} not found."
            });

        alert.IsResolved = true;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
