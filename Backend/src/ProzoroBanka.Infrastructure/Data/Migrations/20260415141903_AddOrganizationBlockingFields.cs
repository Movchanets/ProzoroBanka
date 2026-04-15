using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProzoroBanka.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationBlockingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BlockReason",
                table: "Organizations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "BlockedAtUtc",
                table: "Organizations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsBlocked",
                table: "Organizations",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BlockReason",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "BlockedAtUtc",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "IsBlocked",
                table: "Organizations");
        }
    }
}
