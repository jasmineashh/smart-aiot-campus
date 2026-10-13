
using Microsoft.AspNetCore.Identity;

namespace Campus.Api.Data.Seed;

public static class IdentityRoleSeeder
{
    public static async Task SeedRolesAsync(
        IServiceProvider serviceProvider)
    {
        var roleManager = serviceProvider
            .GetRequiredService<RoleManager<IdentityRole>>();

        string[] roles =
        {
            "Admin",
            "Student",
            "Professor",
            "Staff"
        };

        foreach (var roleName in roles)
        {
            if (await roleManager.RoleExistsAsync(roleName))
            {
                continue;
            }

            var result = await roleManager.CreateAsync(
                new IdentityRole(roleName)
            );

            if (!result.Succeeded)
            {
                var errors = string.Join(
                    ", ",
                    result.Errors.Select(error => error.Description)
                );

                throw new InvalidOperationException(
                    $"Could not create role {roleName}: {errors}"
                );
            }
        }
    }
}
