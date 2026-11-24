
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
public class CamerasController : ControllerBase
{
    private readonly CampusDbContext _db;

    public CamerasController(CampusDbContext db)
    {
        _db = db;
    }

    private static CameraDto ToDto(Camera c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Location = c.Location,
        IsActive = c.IsActive
    };

    // GET api/cameras?activeOnly=true
    [HttpGet]
    public async Task<ActionResult<List<CameraDto>>> GetAll(
        [FromQuery] bool activeOnly = false)
    {
        var query = _db.Cameras
            .AsNoTracking()
            .AsQueryable();

        if (activeOnly)
            query = query.Where(c => c.IsActive);

        var cameras = await query
            .OrderBy(c => c.Name)
            .ToListAsync();

        return Ok(cameras.Select(ToDto));
    }

    // GET api/cameras/1
    [HttpGet("{id:int}")]
    public async Task<ActionResult<CameraDto>> GetById(int id)
    {
        var camera = await _db.Cameras.FindAsync(id);

        if (camera is null)
            return NotFound(new
            {
                message = $"Camera {id} not found."
            });

        return Ok(ToDto(camera));
    }

    // POST api/cameras
    [HttpPost]
    public async Task<ActionResult<CameraDto>> Create(
        CreateCameraDto dto)
    {
        var name = dto.Name.Trim();

        if (await _db.Cameras.AnyAsync(c => c.Name == name))
        {
            return BadRequest(new
            {
                message = $"A camera named '{name}' already exists."
            });
        }

        var camera = new Camera
        {
            Name = name,
            Location = dto.Location.Trim()
        };

        _db.Cameras.Add(camera);
        await _db.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetById),
            new { id = camera.Id },
            ToDto(camera));
    }

    // PUT api/cameras/1
    [HttpPut("{id:int}")]
    public async Task<ActionResult<CameraDto>> Update(
        int id,
        UpdateCameraDto dto)
    {
        var camera = await _db.Cameras.FindAsync(id);

        if (camera is null)
            return NotFound(new
            {
                message = $"Camera {id} not found."
            });

        var name = dto.Name.Trim();

        if (await _db.Cameras.AnyAsync(c =>
            c.Name == name && c.Id != id))
        {
            return BadRequest(new
            {
                message = $"A camera named '{name}' already exists."
            });
        }

        camera.Name = name;
        camera.Location = dto.Location.Trim();
        camera.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();

        return Ok(ToDto(camera));
    }

    // DELETE api/cameras/1
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var camera = await _db.Cameras.FindAsync(id);

        if (camera is null)
            return NotFound(new
            {
                message = $"Camera {id} not found."
            });

        // Preserve existing attendance history.
        if (await _db.AttendanceLogs.AnyAsync(
            a => a.CameraId == id))
        {
            return Conflict(new
            {
                message = "This camera has attendance records. Deactivate it instead (PUT with isActive = false)."
            });
        }

        _db.Cameras.Remove(camera);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
