using Campus.Api.Data;
using Campus.Api.Models;
using Campus.Api.Models.Parking;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Campus.Api.Controllers;

// Shows how biometrics and parking are linked: Vehicle -> owner account -> Person (same UniversityId).
[ApiController]
[Route("api/integration")]
public class IntegrationController : ControllerBase
{
    private readonly CampusDbContext _db;

    public IntegrationController(CampusDbContext db)
    {
        _db = db;
    }

    // GET api/integration/vehicles?search=8888
    [HttpGet("vehicles")]
    public async Task<IActionResult> Vehicles([FromQuery] string? search)
    {
        var vehicles = await _db.Set<Vehicle>().AsNoTracking()
            .Select(v => new
            {
                v.PlateNumber,
                v.IsApproved,
                v.RegisteredAt,
                OwnerName = v.Owner.FullName,
                OwnerUniversityId = v.Owner.UniversityId,
            })
            .ToListAsync();

        var ids = vehicles.Select(v => v.OwnerUniversityId).Distinct().ToList();
        var people = await _db.Persons.AsNoTracking()
            .Where(p => p.UniversityId != null && ids.Contains(p.UniversityId))
            .Select(p => new { p.Id, p.UniversityId, p.Type, p.Department, FaceCount = p.FaceEmbeddings.Count })
            .ToDictionaryAsync(p => p.UniversityId!);

        var result = vehicles.Select(v =>
        {
            people.TryGetValue(v.OwnerUniversityId, out var person);
            return new
            {
                v.PlateNumber,
                v.IsApproved,
                v.RegisteredAt,
                v.OwnerName,
                v.OwnerUniversityId,
                PersonId = person?.Id,
                PersonType = person?.Type.ToString(),
                Department = person?.Department,
                FaceCount = person?.FaceCount ?? 0,
                LinkedToBiometrics = person != null,
            };
        });

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            result = result.Where(r => r.PlateNumber.Contains(s, StringComparison.OrdinalIgnoreCase)
                                    || r.OwnerName.Contains(s, StringComparison.OrdinalIgnoreCase)
                                    || r.OwnerUniversityId.Contains(s, StringComparison.OrdinalIgnoreCase));
        }

        return Ok(result.OrderBy(r => r.OwnerUniversityId));
    }
}
