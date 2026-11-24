
using Campus.Api.Data;
using Campus.Api.Dtos;
using Campus.Api.Models;
using Campus.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Campus.Api.Controllers;

[ApiController]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class FacesController : ControllerBase
{
    private const int MaxFacesPerPerson = 10;

    private static readonly int[] AllowedDimensions =
    {
        128, 512
    };

    private readonly CampusDbContext _db;

    public FacesController(CampusDbContext db)
    {
        _db = db;
    }

    // POST api/persons/1/faces
    // Device-authenticated face enrollment.
    [RequireDeviceKey]
    [HttpPost("api/persons/{personId:int}/faces")]
    public async Task<ActionResult<FaceEmbeddingDto>> Enroll(
        int personId,
        EnrollFaceDto dto)
    {
        var person = await _db.Persons.FindAsync(personId);

        if (person is null)
            return NotFound(new
            {
                message = $"Person {personId} not found."
            });

        if (!AllowedDimensions.Contains(dto.Vector.Length))
        {
            return BadRequest(new
            {
                message = $"Vector must have {string.Join(" or ", AllowedDimensions)} numbers, got {dto.Vector.Length}."
            });
        }

        if (dto.Vector.Any(v =>
            float.IsNaN(v) || float.IsInfinity(v)))
        {
            return BadRequest(new
            {
                message = "Vector contains invalid numbers."
            });
        }

        var count = await _db.FaceEmbeddings
            .CountAsync(f => f.PersonId == personId);

        if (count >= MaxFacesPerPerson)
        {
            return BadRequest(new
            {
                message = $"This person already has {MaxFacesPerPerson} faces. Delete one first."
            });
        }

        var face = new FaceEmbedding
        {
            PersonId = personId,
            Vector = dto.Vector,
            ModelName = string.IsNullOrWhiteSpace(dto.ModelName)
                ? "ArcFace"
                : dto.ModelName.Trim()
        };

        _db.FaceEmbeddings.Add(face);
        await _db.SaveChangesAsync();

        return Ok(ToDto(face));
    }

    // GET api/persons/1/faces
    // Device-authenticated enrollment information.
    [RequireDeviceKey]
    [HttpGet("api/persons/{personId:int}/faces")]
    public async Task<ActionResult<List<FaceEmbeddingDto>>> GetForPerson(
        int personId)
    {
        if (!await _db.Persons.AnyAsync(
            p => p.Id == personId))
        {
            return NotFound(new
            {
                message = $"Person {personId} not found."
            });
        }

        var faces = await _db.FaceEmbeddings
            .AsNoTracking()
            .Where(f => f.PersonId == personId)
            .OrderBy(f => f.CreatedAt)
            .ToListAsync();

        return Ok(faces.Select(ToDto));
    }

    // DELETE api/faces/5
    // Only administrators may remove face enrollments.
    [Authorize(Roles = "Admin")]
    [ValidateAntiForgeryToken]
    [HttpDelete("api/faces/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var face = await _db.FaceEmbeddings.FindAsync(id);

        if (face is null)
            return NotFound(new
            {
                message = $"Face {id} not found."
            });

        _db.FaceEmbeddings.Remove(face);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // GET api/faces/gallery?modelName=ArcFace
    // Sensitive biometric vectors are available
    // only to authenticated AI devices.
    [RequireDeviceKey]
    [HttpGet("api/faces/gallery")]
    public async Task<ActionResult<List<FaceGalleryItemDto>>> Gallery(
        [FromQuery] string modelName = "ArcFace")
    {
        var items = await _db.FaceEmbeddings
            .AsNoTracking()
            .Where(f =>
                f.ModelName == modelName &&
                f.Person.IsActive)
            .Select(f => new FaceGalleryItemDto
            {
                EmbeddingId = f.Id,
                PersonId = f.PersonId,
                FullName = f.Person.FullName,
                PersonType = f.Person.Type.ToString(),
                Vector = f.Vector
            })
            .ToListAsync();

        return Ok(items);
    }

    private static FaceEmbeddingDto ToDto(
        FaceEmbedding f) => new()
    {
        Id = f.Id,
        PersonId = f.PersonId,
        ModelName = f.ModelName,
        Dimensions = f.Vector.Length,
        CreatedAt = f.CreatedAt
    };
}
