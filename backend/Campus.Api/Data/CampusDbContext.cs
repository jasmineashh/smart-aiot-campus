using Campus.Api.Models;
using Campus.Api.Models.Identity;
using Campus.Api.Models.Parking;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Campus.Api.Data;

public class CampusDbContext : IdentityDbContext<ApplicationUser>
{
    public CampusDbContext(
        DbContextOptions<CampusDbContext> options
    ) : base(options)
    {
    }

    // SMART PARKING
    public DbSet<ParkingZone> ParkingZones => Set<ParkingZone>();
    public DbSet<ParkingSpace> ParkingSpaces => Set<ParkingSpace>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();

    // BIOMETRICS
    public DbSet<Person> Persons => Set<Person>();
    public DbSet<FaceEmbedding> FaceEmbeddings => Set<FaceEmbedding>();
    public DbSet<Camera> Cameras => Set<Camera>();
    public DbSet<AttendanceLog> AttendanceLogs => Set<AttendanceLog>();
    public DbSet<AccessRule> AccessRules => Set<AccessRule>();
    public DbSet<Alert> Alerts => Set<Alert>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        // Required for ASP.NET Core Identity tables
        base.OnModelCreating(builder);

        // UNIVERSITY USERS
        builder.Entity<ApplicationUser>(entity =>
        {
            entity.HasIndex(u => u.UniversityId).IsUnique();

            entity.Property(u => u.FullName)
                .HasMaxLength(150).IsRequired();

            entity.Property(u => u.UniversityId)
                .HasMaxLength(50).IsRequired();

            entity.Property(u => u.Department)
                .HasMaxLength(150);
        });

        // PARKING ZONES
        builder.Entity<ParkingZone>(entity =>
        {
            entity.HasKey(z => z.Id);

            entity.HasIndex(z => z.Code).IsUnique();

            entity.Property(z => z.Code)
                .HasMaxLength(30).IsRequired();

            entity.Property(z => z.Name)
                .HasMaxLength(150).IsRequired();

            entity.Property(z => z.Description)
                .HasMaxLength(500);

            entity.Property(z => z.ZoneType)
                .HasMaxLength(30).IsRequired();
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
                .HasMaxLength(30).IsRequired();

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

            entity.Property(v => v.NormalizedPlateNumber)
                .HasMaxLength(30);

            entity.HasIndex(v => v.NormalizedPlateNumber)
                .IsUnique()
                .HasFilter("\"NormalizedPlateNumber\" IS NOT NULL");

            entity.Property(v => v.Make)
                .HasMaxLength(80);

            entity.Property(v => v.Model)
                .HasMaxLength(80);

            entity.Property(v => v.Color)
                .HasMaxLength(50);

            entity.Property(v => v.ApprovalStatus)
                .HasMaxLength(20)
                .HasDefaultValue("Pending")
                .IsRequired();

            entity.Property(v => v.RejectionReason)
                .HasMaxLength(500);

            entity.HasOne(v => v.Owner)
                .WithMany()
                .HasForeignKey(v => v.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(v => v.ReviewedBy)
                .WithMany()
                .HasForeignKey(v => v.ReviewedById)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(v => v.OwnerId);

            entity.HasIndex(v => v.ApprovalStatus);

            entity.HasIndex(v => v.ReviewedById);

            entity.ToTable("Vehicles", table =>
            {
                table.HasCheckConstraint(
                    "CK_Vehicles_ApprovalStatus",
                    "\"ApprovalStatus\" IN " +
                    "('Pending', 'Approved', 'Rejected')");

                table.HasCheckConstraint(
                    "CK_Vehicles_ApprovalConsistency",
                    "\"IsApproved\" = " +
                    "(\"ApprovalStatus\" = 'Approved')");
            });
        });

        // BIOMETRIC PERSONS
        builder.Entity<Person>(entity =>
        {
            entity.Property(p => p.FullName)
                .HasMaxLength(150).IsRequired();

            entity.Property(p => p.Type)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(p => p.UniversityId)
                .HasMaxLength(30);

            entity.HasIndex(p => p.UniversityId).IsUnique();
        });

        // FACE EMBEDDINGS
        builder.Entity<FaceEmbedding>(entity =>
        {
            entity.HasOne(f => f.Person)
                .WithMany(p => p.FaceEmbeddings)
                .HasForeignKey(f => f.PersonId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // CAMERAS
        builder.Entity<Camera>(entity =>
        {
            entity.Property(c => c.Name)
                .HasMaxLength(100).IsRequired();

            entity.Property(c => c.Location)
                .HasMaxLength(100).IsRequired();
        });

        // ATTENDANCE LOGS
        builder.Entity<AttendanceLog>(entity =>
        {
            entity.Property(a => a.Result)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.HasOne(a => a.Person)
                .WithMany(p => p.AttendanceLogs)
                .HasForeignKey(a => a.PersonId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(a => a.Camera)
                .WithMany()
                .HasForeignKey(a => a.CameraId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(a => a.Timestamp);
        });

        // ACCESS RULES
        builder.Entity<AccessRule>(entity =>
        {
            entity.Property(r => r.AllowedType)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.HasOne(r => r.Camera)
                .WithMany()
                .HasForeignKey(r => r.CameraId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // SECURITY ALERTS
        builder.Entity<Alert>(entity =>
        {
            entity.Property(a => a.Type)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.HasOne(a => a.AttendanceLog)
                .WithMany()
                .HasForeignKey(a => a.AttendanceLogId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
