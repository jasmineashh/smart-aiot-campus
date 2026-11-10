using Campus.Api.Data;
using Campus.Api.Dtos;
using Campus.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Campus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccessRulesController : ControllerBase
{
    private readonly CampusDbContext _db;

    public AccessRulesController(CampusDbContext db)
    {
        _db = db;
    }

    // GET api/accessrules?cameraId=2
    [HttpGet]
    public async Task<ActionResult<List<AccessRuleDto>>> GetAll([FromQuery] int? cameraId)
    {
        var query = _db.AccessRules.AsNoTracking().AsQueryable();
        if (cameraId is not null)
            query = query.Where(r => r.CameraId == cameraId);

        var rules = await query
            .OrderBy(r => r.CameraId).ThenBy(r => r.StartTime)
            .Select(r => new AccessRuleDto
            {
                Id = r.Id,
                CameraId = r.CameraId,
                CameraName = r.Camera.Name,
                AllowedType = r.AllowedType,
                StartTime = r.StartTime,
                EndTime = r.EndTime
            })
            .ToListAsync();

        return Ok(rules);
    }

    // POST api/accessrules
    [HttpPost]
    public async Task<ActionResult<AccessRuleDto>> Create(CreateAccessRuleDto dto)
    {
        var error = await Validate(dto);
        if (error is not null)
            return BadRequest(new { message = error });

        var rule = new AccessRule
        {
            CameraId = dto.CameraId,
            AllowedType = dto.AllowedType,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime
        };
        _db.AccessRules.Add(rule);
        await _db.SaveChangesAsync();

        return Ok(await ToDto(rule.Id));
    }

    // PUT api/accessrules/1
    [HttpPut("{id:int}")]
    public async Task<ActionResult<AccessRuleDto>> Update(int id, CreateAccessRuleDto dto)
    {
        var rule = await _db.AccessRules.FindAsync(id);
        if (rule is null)
            return NotFound(new { message = $"Access rule {id} not found." });

        var error = await Validate(dto);
        if (error is not null)
            return BadRequest(new { message = error });

        rule.CameraId = dto.CameraId;
        rule.AllowedType = dto.AllowedType;
        rule.StartTime = dto.StartTime;
        rule.EndTime = dto.EndTime;
        await _db.SaveChangesAsync();

        return Ok(await ToDto(id));
    }

    // DELETE api/accessrules/1
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var rule = await _db.AccessRules.FindAsync(id);
        if (rule is null)
            return NotFound(new { message = $"Access rule {id} not found." });

        _db.AccessRules.Remove(rule);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ---------- helpers ----------

    private async Task<string?> Validate(CreateAccessRuleDto dto)
    {
        if (!await _db.Cameras.AnyAsync(c => c.Id == dto.CameraId))
            return $"Camera {dto.CameraId} not found.";
        if (dto.StartTime == dto.EndTime)
            return "StartTime and EndTime can't be the same.";
        return null;
    }

    private Task<AccessRuleDto> ToDto(int id) =>
        _db.AccessRules.Where(r => r.Id == id).Select(r => new AccessRuleDto
        {
            Id = r.Id,
            CameraId = r.CameraId,
            CameraName = r.Camera.Name,
            AllowedType = r.AllowedType,
            StartTime = r.StartTime,
            EndTime = r.EndTime
        }).FirstAsync();
}