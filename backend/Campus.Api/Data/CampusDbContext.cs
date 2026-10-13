
using Campus.Api.Models.Identity;
using Campus.Api.Models.Parking;
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

    // Smart Parking tables
    public DbSet<ParkingZone> ParkingZones => Set<ParkingZone>();

    public DbSet<ParkingSpace> ParkingSpaces => Set<ParkingSpace>();

    public DbSet<Vehicle> Vehicles => Set<Vehicle>();

    protected override void OnModelCreating(
        ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // UNIVERSITY USERS

        builder.Entity<ApplicationUser>(entity =>
        {
            entity.HasIndex(u => u.UniversityId)
                .IsUnique();

            entity.Property(u => u.FullName)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(u => u.UniversityId)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(u => u.Department)
                .HasMaxLength(150);
        });

        // PARKING ZONES

        builder.Entity<ParkingZone>(entity =>
        {
            entity.HasKey(z => z.Id);

            entity.HasIndex(z => z.Code)
                .IsUnique();

            entity.Property(z => z.Code)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(z => z.Name)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(z => z.Description)
                .HasMaxLength(500);

            entity.Property(z => z.ZoneType)
                .HasMaxLength(30)
                .IsRequired();
        });

        // PARKING SPACES

        builder.Entity<ParkingSpace>(entity =>
        {
            entity.HasKey(s => s.Id);

            entity.HasIndex(s => new
            {
                s.ParkingZoneId,
                s.SpaceNumber
            }).IsUnique();

            entity.Property(s => s.SpaceNumber)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(s => s.SensorDeviceId)
                .HasMaxLength(100);

            entity.Property(s => s.Status)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.Property(s => s.Type)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.HasOne(s => s.Zone)
                .WithMany(z => z.Spaces)
                .HasForeignKey(s => s.ParkingZoneId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // REGISTERED VEHICLES

        builder.Entity<Vehicle>(entity =>
        {
            entity.HasKey(v => v.Id);

            entity.Property(v => v.PlateNumber)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(v => v.Make)
                .HasMaxLength(80);

            entity.Property(v => v.Model)
                .HasMaxLength(80);

            entity.Property(v => v.Color)
                .HasMaxLength(50);

            entity.HasOne(v => v.Owner)
                .WithMany()
                .HasForeignKey(v => v.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(v => v.OwnerId);
        });
    }
}
