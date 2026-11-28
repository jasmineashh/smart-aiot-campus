using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Campus.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleRegistrationAndApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ApprovalStatus",
                table: "Vehicles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Pending");

            migrationBuilder.AddColumn<string>(
                name: "NormalizedPlateNumber",
                table: "Vehicles",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "Vehicles",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "Vehicles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewedById",
                table: "Vehicles",
                type: "text",
                nullable: true);

            // Preserve existing vehicle approval decisions
            // before applying the consistency constraint.
            migrationBuilder.Sql(
                """
                UPDATE "Vehicles"
                SET "ApprovalStatus" =
                    CASE
                        WHEN "IsApproved" = TRUE
                            THEN 'Approved'
                        ELSE 'Pending'
                    END;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_ApprovalStatus",
                table: "Vehicles",
                column: "ApprovalStatus");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_NormalizedPlateNumber",
                table: "Vehicles",
                column: "NormalizedPlateNumber",
                unique: true,
                filter: "\"NormalizedPlateNumber\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_ReviewedById",
                table: "Vehicles",
                column: "ReviewedById");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_ApprovalConsistency",
                table: "Vehicles",
                sql: "\"IsApproved\" = (\"ApprovalStatus\" = 'Approved')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_ApprovalStatus",
                table: "Vehicles",
                sql: "\"ApprovalStatus\" IN ('Pending', 'Approved', 'Rejected')");

            migrationBuilder.AddForeignKey(
                name: "FK_Vehicles_AspNetUsers_ReviewedById",
                table: "Vehicles",
                column: "ReviewedById",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Vehicles_AspNetUsers_ReviewedById",
                table: "Vehicles");

            migrationBuilder.DropIndex(
                name: "IX_Vehicles_ApprovalStatus",
                table: "Vehicles");

            migrationBuilder.DropIndex(
                name: "IX_Vehicles_NormalizedPlateNumber",
                table: "Vehicles");

            migrationBuilder.DropIndex(
                name: "IX_Vehicles_ReviewedById",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_ApprovalConsistency",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_ApprovalStatus",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "ApprovalStatus",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "NormalizedPlateNumber",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "ReviewedById",
                table: "Vehicles");
        }
    }
}
