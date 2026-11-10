using Campus.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Campus.Api.Data;

public class CampusDbContext : DbContext
{
    public CampusDbContext(DbContextOptions<CampusDbContext> options) : base(options) { }

    public DbSet<Person> Persons => Set<Person>();
    public DbSet<FaceEmbedding> FaceEmbeddings => Set<FaceEmbedding>();
    public DbSet<Camera> Cameras => Set<Camera>();
    public DbSet<AttendanceLog> AttendanceLogs => Set<AttendanceLog>();
    public DbSet<AccessRule> AccessRules => Set<AccessRule>();
    public DbSet<Alert> Alerts => Set<Alert>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Person>(e =>
        {
            e.Property(p => p.FullName).HasMaxLength(150).IsRequired();
            e.Property(p => p.Type).HasConversion<string>().HasMaxLength(20);
            e.Property(p => p.UniversityId).HasMaxLength(30);
            e.HasIndex(p => p.UniversityId).IsUnique();
        });

        modelBuilder.Entity<FaceEmbedding>(e =>
        {
            e.HasOne(f => f.Person).WithMany(p => p.FaceEmbeddings)
             .HasForeignKey(f => f.PersonId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Camera>(e =>
        {
            e.Property(c => c.Name).HasMaxLength(100).IsRequired();
            e.Property(c => c.Location).HasMaxLength(100);
        });

        modelBuilder.Entity<AttendanceLog>(e =>
        {
            e.Property(a => a.Result).HasConversion<string>().HasMaxLength(20);
            e.HasOne(a => a.Person).WithMany(p => p.AttendanceLogs)
             .HasForeignKey(a => a.PersonId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(a => a.Camera).WithMany()
             .HasForeignKey(a => a.CameraId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(a => a.Timestamp);
        });

        modelBuilder.Entity<AccessRule>(e =>
        {
            e.Property(r => r.AllowedType).HasConversion<string>().HasMaxLength(20);
            e.HasOne(r => r.Camera).WithMany()
             .HasForeignKey(r => r.CameraId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Alert>(e =>
        {
            e.Property(a => a.Type).HasConversion<string>().HasMaxLength(30);
            e.HasOne(a => a.AttendanceLog).WithMany()
             .HasForeignKey(a => a.AttendanceLogId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}