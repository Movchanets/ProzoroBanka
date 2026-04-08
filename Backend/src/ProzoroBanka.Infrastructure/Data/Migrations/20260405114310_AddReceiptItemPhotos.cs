using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProzoroBanka.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReceiptItemPhotos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReceiptItemPhotos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReceiptId = table.Column<Guid>(type: "uuid", nullable: false),
                    StorageKey = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    OriginalFileName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReceiptItemPhotos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReceiptItemPhotos_Receipts_ReceiptId",
                        column: x => x.ReceiptId,
                        principalTable: "Receipts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptItemPhotos_ReceiptId",
                table: "ReceiptItemPhotos",
                column: "ReceiptId");

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptItemPhotos_ReceiptId_SortOrder",
                table: "ReceiptItemPhotos",
                columns: new[] { "ReceiptId", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReceiptItemPhotos");
        }
    }
}
