using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProzoroBanka.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReceiptRegistryFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Receipts",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FiscalNumber",
                table: "Receipts",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OcrExtractedAtUtc",
                table: "Receipts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OcrStructuredPayloadJson",
                table: "Receipts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PublicationStatus",
                table: "Receipts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "PurchaseDateUtc",
                table: "Receipts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PurchasedItemName",
                table: "Receipts",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptCode",
                table: "Receipts",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptImageStorageKey",
                table: "Receipts",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RegistryType",
                table: "Receipts",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StateVerificationReference",
                table: "Receipts",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StateVerifiedAtUtc",
                table: "Receipts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerificationFailureReason",
                table: "Receipts",
                type: "character varying(1024)",
                maxLength: 1024,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "OrganizationStateRegistryCredentials",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Provider = table.Column<int>(type: "integer", nullable: false),
                    EncryptedApiKey = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    KeyFingerprint = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    LastValidatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastUsedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    BlockedUntilUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationStateRegistryCredentials", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrganizationStateRegistryCredentials_Organizations_Organiza~",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrganizationStateRegistryCredentials_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationStateRegistryCredentials_CreatedByUserId",
                table: "OrganizationStateRegistryCredentials",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationStateRegistryCredentials_OrganizationId_Provider",
                table: "OrganizationStateRegistryCredentials",
                columns: new[] { "OrganizationId", "Provider" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrganizationStateRegistryCredentials");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "FiscalNumber",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "OcrExtractedAtUtc",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "OcrStructuredPayloadJson",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "PublicationStatus",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "PurchaseDateUtc",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "PurchasedItemName",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "ReceiptCode",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "ReceiptImageStorageKey",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "RegistryType",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "StateVerificationReference",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "StateVerifiedAtUtc",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "VerificationFailureReason",
                table: "Receipts");
        }
    }
}
