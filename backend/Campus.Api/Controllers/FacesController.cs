using Campus.Api.Data;
using Campus.Api.Dtos;
using Campus.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Campus.Api.Security;

namespace Campus.Api.Controllers;

[ApiController]
public class FacesController : ControllerBase
{
    private const int MaxFacesPerPerson = 10;
    private static readonly int[] AllowedDimensions = { 128, 512 }; // FaceNet = 128, ArcFace = 512

    private readonly CampusDbContext _db;

    public FacesController(CampusDbContext db)
    {
        _db = db;
    }

  [RequireDeviceKey]
    // POST api/persons/1/faces   (enroll one face for a person)
    [HttpPost("api/persons/{personId:int}/faces")]
    public async Task<ActionResult<FaceEmbeddingDto>> Enroll(int personId, EnrollFaceDto dto)
    {
        var person = await _db.Persons.FindAsync(personId);
        if (person is null)
            return NotFound(new { message = $"Person {personId} not found." });

        if (!AllowedDimensions.Contains(dto.Vector.Length))
            return BadRequest(new { message = $"Vector must have {string.Join(" or ", AllowedDimensions)} numbers, got {dto.Vector.Length}." });

        if (dto.Vector.Any(v => float.IsNaN(v) || float.IsInfinity(v)))
            return BadRequest(new { message = "Vector contains invalid numbers." });

        var count = await _db.FaceEmbeddings.CountAsync(f => f.PersonId == personId);
        if (count >= MaxFacesPerPerson)
            return BadRequest(new { message = $"This person already has {MaxFacesPerPerson} faces. Delete one first." });

        var face = new FaceEmbedding
        {
            PersonId = personId,
            Vector = dto.Vector,
            ModelName = string.IsNullOrWhiteSpace(dto.ModelName) ? "ArcFace" : dto.ModelName.Trim()
        };
        _db.FaceEmbeddings.Add(face);
        await _db.SaveChangesAsync();

        return Ok(ToDto(face));
    }

  [RequireDeviceKey]
    // GET api/persons/1/faces   (list a person's enrolled faces)
    [HttpGet("api/persons/{personId:int}/faces")]
    public async Task<ActionResult<List<FaceEmbeddingDto>>> GetForPerson(int personId)
    {
        if (!await _db.Persons.AnyAsync(p => p.Id == personId))
            return NotFound(new { message = $"Person {personId} not found." });

        var faces = await _db.FaceEmbeddings.AsNoTracking()
            .Where(f => f.PersonId == personId)
            .OrderBy(f => f.CreatedAt)
            .ToListAsync();

        return Ok(faces.Select(ToDto));
    }

    // DELETE api/faces/5
    [HttpDelete("api/faces/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var face = await _db.FaceEmbeddings.FindAsync(id);
        if (face is null)
            return NotFound(new { message = $"Face {id} not found." });

        _db.FaceEmbeddings.Remove(face);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET api/faces/gallery?modelName=ArcFace   (the AI downloads this to match faces)
    [HttpGet("api/faces/gallery")]
    public async Task<ActionResult<List<FaceGalleryItemDto>>> Gallery([FromQuery] string modelName = "ArcFace")
    {
        var items = await _db.FaceEmbeddings.AsNoTracking()
            .Where(f => f.ModelName == modelName && f.Person.IsActive)
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

    private static FaceEmbeddingDto ToDto(FaceEmbedding f) => new()
    {
        Id = f.Id,
        PersonId = f.PersonId,
        ModelName = f.ModelName,
        Dimensions = f.Vector.Length,
        CreatedAt = f.CreatedAt
    };
}