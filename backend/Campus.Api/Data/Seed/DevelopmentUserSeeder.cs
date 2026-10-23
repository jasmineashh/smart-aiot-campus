
using Campus.Api.Models.Identity;
using Campus.Api.Models.Parking;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Campus.Api.Data.Seed;

public static class DevelopmentUserSeeder
{
    private record DemoAccount(
        string Name,
        string UniversityId,
        string Email,
        string Role,
        string Department,
        string Plate,
        string Make,
        string Model,
        string Color
    );

    private static readonly DemoAccount[] Accounts =
    {
        new("Demo Student", "TEST-STU-001",
            "student01@campus.example", "Student",
            "Computer Engineering", "TEST-101",
            "Toyota", "Corolla", "White"),

        new("Demo Resident Student", "TEST-RES-001",
            "resident01@campus.example", "Student",
            "Computer Engineering", "TEST-102",
            "Hyundai", "Elantra", "Silver"),

        new("Demo Professor", "TEST-PRO-001",
            "professor01@campus.example", "Professor",
            "Computer Engineering", "TEST-201",
            "Kia", "Sportage", "Black"),

        new("Demo Staff", "TEST-STA-001",
            "staff01@campus.example", "Staff",
            "Administration", "TEST-301",
            "Nissan", "Sunny", "Blue")
    };

    public static async Task SeedAsync(IServiceProvider services)
    {
        var config = services.GetRequiredService<IConfiguration>();
        var environment = services.GetRequiredService<IHostEnvironment>();

        if (!config.GetValue<bool>("DevSeed:CampusAccountsEnabled"))
            return;

        if (!environment.IsDevelopment())
            throw new InvalidOperationException(
                "Demo account seeding requires Development mode.");

        var password = config["DevSeed:CampusAccountsPassword"];

        if (string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException(
                "DevSeed:CampusAccountsPassword is missing.");

        var users = services.GetRequiredService<UserManager<ApplicationUser>>();
        var roles = services.GetRequiredService<RoleManager<IdentityRole>>();
        var db = services.GetRequiredService<CampusDbContext>();

        foreach (var account in Accounts)
        {
            if (!await roles.RoleExistsAsync(account.Role))
                throw new InvalidOperationException(
                    $"Missing role: {account.Role}");

            var user = await users.FindByEmailAsync(account.Email);

            if (user == null)
            {
                if (await db.Users.AnyAsync(
                    u => u.UniversityId == account.UniversityId))
                    throw new InvalidOperationException(
                        $"University ID already exists: {account.UniversityId}");

                user = new ApplicationUser
                {
                    UserName = account.Email,
                    Email = account.Email,
                    EmailConfirmed = true,
                    FullName = account.Name,
                    UniversityId = account.UniversityId,
                    Department = account.Department,
                    IsActive = true
                };

                var created = await users.CreateAsync(user, password);

                if (!created.Succeeded)
                    throw new InvalidOperationException(
                        string.Join("; ",
                            created.Errors.Select(e => e.Description)));
            }
            else if (user.UniversityId != account.UniversityId)
            {
                throw new InvalidOperationException(
                    $"Email belongs to a different account: {account.Email}");
            }

            var assignedRoles = await users.GetRolesAsync(user);

            if (assignedRoles.Any(r => r != account.Role))
                throw new InvalidOperationException(
                    $"Unexpected role for {account.UniversityId}");

            if (!assignedRoles.Contains(account.Role))
            {
                var result = await users.AddToRoleAsync(user, account.Role);

                if (!result.Succeeded)
                    throw new InvalidOperationException(
                        string.Join("; ",
                            result.Errors.Select(e => e.Description)));
            }

            var existingVehicle = await db.Vehicles
                .FirstOrDefaultAsync(v => v.PlateNumber == account.Plate);

            if (existingVehicle != null)
            {
                if (existingVehicle.OwnerId != user.Id)
                    throw new InvalidOperationException(
                        $"Vehicle ownership conflict: {account.Plate}");

                continue;
            }

            db.Vehicles.Add(new Vehicle
            {
                OwnerId = user.Id,
                PlateNumber = account.Plate,
                Make = account.Make,
                Model = account.Model,
                Color = account.Color,
                IsApproved = false,
                RegisteredAt = DateTime.UtcNow
            });

            await db.SaveChangesAsync();
        }

        Console.WriteLine(
            "Campus demo accounts and vehicles checked successfully.");
    }
}
