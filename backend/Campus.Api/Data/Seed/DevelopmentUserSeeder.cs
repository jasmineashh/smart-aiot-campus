
using Campus.Api.Models.Identity;
using Microsoft.AspNetCore.Identity;

namespace Campus.Api.Data.Seed;

public static class DevelopmentUserSeeder
{
    public static async Task SeedAsync(
        IServiceProvider services)
    {
        var configuration = services
            .GetRequiredService<IConfiguration>();

        // Only run when explicitly enabled.
        if (!configuration.GetValue<bool>("DevSeed:Enabled"))
            return;

        var password = configuration["DevSeed:StudentPassword"];

        if (string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                "Development student password is missing."
            );
        }

        var userManager = services
            .GetRequiredService<UserManager<ApplicationUser>>();

        const string email = "student.demo@campus.example";

        var existingUser =
            await userManager.FindByEmailAsync(email);

        if (existingUser != null)
            return;

        var student = new ApplicationUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            FullName = "Demo Student",
            UniversityId = "TEST0001",
            Department = "Computer Engineering",
            IsActive = true
        };

        var result = await userManager.CreateAsync(
            student,
            password
        );

        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                string.Join(
                    "; ",
                    result.Errors.Select(e => e.Description)
                )
            );
        }

        var roleResult =
            await userManager.AddToRoleAsync(
                student,
                "Student"
            );

        if (!roleResult.Succeeded)
        {
            throw new InvalidOperationException(
                "Failed to assign Student role."
            );
        }
    }
}
