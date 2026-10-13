
using Campus.Api.Models.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Campus.Api.Data;

public class CampusDbContext
    : IdentityDbContext<ApplicationUser>
{
    public CampusDbContext(
        DbContextOptions<CampusDbContext> options
    ) : base(options)
    {
    }

    protected override void OnModelCreating(
        ModelBuilder builder
    )
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>()
            .HasIndex(user => user.UniversityId)
            .IsUnique();

        builder.Entity<ApplicationUser>()
            .Property(user => user.FullName)
            .HasMaxLength(150)
            .IsRequired();

        builder.Entity<ApplicationUser>()
            .Property(user => user.UniversityId)
            .HasMaxLength(50)
            .IsRequired();

        builder.Entity<ApplicationUser>()
            .Property(user => user.Department)
            .HasMaxLength(150);
    }
}
