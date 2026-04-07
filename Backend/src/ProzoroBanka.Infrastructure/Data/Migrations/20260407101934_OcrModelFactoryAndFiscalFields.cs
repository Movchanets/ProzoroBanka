using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProzoroBanka.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class OcrModelFactoryAndFiscalFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ParsedByModel",
                table: "Receipts",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.DropColumn(
                name: "ParsedBy",
                table: "Receipts");

            migrationBuilder.CreateTable(
                name: "OcrModelConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ModelIdentifier = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Provider = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OcrModelConfigs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OcrModelConfigs_ModelIdentifier",
                table: "OcrModelConfigs",
                column: "ModelIdentifier",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OcrModelConfigs");

            migrationBuilder.DropColumn(
                name: "ParsedByModel",
                table: "Receipts");

            migrationBuilder.AddColumn<int>(
                name: "ParsedBy",
                table: "Receipts",
                type: "integer",
                nullable: true);
        }
    }
}
