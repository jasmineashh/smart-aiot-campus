using System.Linq.Expressions;
using Campus.Api.Data;
using Campus.Api.Dtos;
using Campus.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Campus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PersonsController : ControllerBase
{
    private readonly CampusDbContext _db;

    public PersonsController(CampusDbContext db)
    {
        _db = db;
    }

    // Converts a Person (database) into a PersonDto (response)
    private static readonly Expression<Func<Person, PersonDto>> ToDto = p => new PersonDto
    {
        Id = p.Id,
        FullName = p.FullName,
        Type = p.Type,
        UniversityId = p.UniversityId,
        Department = p.Department,
        Email = p.Email,
        Phone = p.Phone,
        IsActive = p.IsActive,
        VisitStart = p.VisitStart,
        VisitEnd = p.VisitEnd,
        FaceCount = p.FaceEmbeddings.Count
    };

    // GET api/persons?type=Student&search=ahmed
    [HttpGet]
    public async Task<ActionResult<List<PersonDto>>> GetAll(
        [FromQuery] PersonType? type, [FromQuery] string? search)
    {
        var query = _db.Persons.AsNoTracking().AsQueryable();

        if (type is not null)
            query = query.Where(p => p.Type == type);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p =>
                EF.Functions.ILike(p.FullName, $"%{search}%") ||
                (p.UniversityId != null && EF.Functions.ILike(p.UniversityId, $"%{search}%")));

        var people = await query.OrderBy(p => p.FullName).Select(ToDto).ToListAsync();
        return Ok(people);
    }

    // GET api/persons/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<PersonDto>> GetById(int id)
    {
        var person = await _db.Persons.AsNoTracking()
            .Where(p => p.Id == id).Select(ToDto).FirstOrDefaultAsync();

        if (person is null)
            return NotFound(new { message = $"Person {id} not found." });

        return Ok(person);
    }

    // POST api/persons
    [HttpPost]
    public async Task<ActionResult<PersonDto>> Create(CreatePersonDto dto)
    {
        var universityId = Clean(dto.UniversityId);
        var visitStart = ToUtc(dto.VisitStart);
        var visitEnd = ToUtc(dto.VisitEnd);

        var error = await Validate(dto.Type, universityId, visitStart, visitEnd, excludeId: 0);
        if (error is not null)
            return BadRequest(new { message = error });

        var person = new Person
        {
            FullName = dto.FullName.Trim(),
            Type = dto.Type,
            UniversityId = universityId,
            Department = Clean(dto.Department),
            Email = Clean(dto.Email),
            Phone = Clean(dto.Phone),
            VisitStart = visitStart,
            VisitEnd = visitEnd
        };

        _db.Persons.Add(person);
        await _db.SaveChangesAsync();

        var result = await _db.Persons.Where(p => p.Id == person.Id).Select(ToDto).FirstAsync();
        return CreatedAtAction(nameof(GetById), new { id = person.Id }, result);
    }

    // PUT api/persons/5
    [HttpPut("{id:int}")]
    public async Task<ActionResult<PersonDto>> Update(int id, UpdatePersonDto dto)
    {
        var person = await _db.Persons.FindAsync(id);
        if (person is null)
            return NotFound(new { message = $"Person {id} not found." });

        var universityId = Clean(dto.UniversityId);
        var visitStart = ToUtc(dto.VisitStart);
        var visitEnd = ToUtc(dto.VisitEnd);

        var error = await Validate(dto.Type, universityId, visitStart, visitEnd, excludeId: id);
        if (error is not null)
            return BadRequest(new { message = error });

        person.FullName = dto.FullName.Trim();
        person.Type = dto.Type;
        person.UniversityId = universityId;
        person.Department = Clean(dto.Department);
        person.Email = Clean(dto.Email);
        person.Phone = Clean(dto.Phone);
        person.VisitStart = visitStart;
        person.VisitEnd = visitEnd;
        person.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();

        var result = await _db.Persons.Where(p => p.Id == id).Select(ToDto).FirstAsync();
        return Ok(result);
    }

    // DELETE api/persons/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var person = await _db.Persons.FindAsync(id);
        if (person is null)
            return NotFound(new { message = $"Person {id} not found." });

        _db.Persons.Remove(person);   // their face embeddings are deleted too
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ---------- helpers ----------

    // Business rules for a person
    private async Task<string?> Validate(
        PersonType type, string? universityId, DateTime? visitStart, DateTime? visitEnd, int excludeId)
    {
        if (type != PersonType.Visitor && universityId is null)
            return "UniversityId is required for students and staff.";

        if (type == PersonType.Visitor)
        {
            if (visitStart is null || visitEnd is null)
                return "VisitStart and VisitEnd are required for visitors.";
            if (visitEnd <= visitStart)
                return "VisitEnd must be after VisitStart.";
        }

        if (universityId is not null &&
            await _db.Persons.AnyAsync(p => p.UniversityId == universityId && p.Id != excludeId))
            return $"Another person already has UniversityId '{universityId}'.";

        return null;
    }

    // Turns empty text into null and removes extra spaces
    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    // PostgreSQL needs UTC dates
    private static DateTime? ToUtc(DateTime? value) =>
        value is null ? null :
        value.Value.Kind == DateTimeKind.Utc ? value : value.Value.ToUniversalTime();
}