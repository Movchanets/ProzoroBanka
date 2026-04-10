using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProzoroBanka.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReceiptOrganizationScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                table: "Receipts",
                type: "uuid",
                nullable: true);

                        migrationBuilder.Sql(@"
                                UPDATE ""Receipts"" r
                                SET ""OrganizationId"" = c.""OrganizationId""
                                FROM ""Campaigns"" c
                                WHERE r.""CampaignId"" = c.""Id""
                                    AND r.""OrganizationId"" IS NULL;
                        ");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_OrganizationId",
                table: "Receipts",
                column: "OrganizationId");

            migrationBuilder.AddForeignKey(
                name: "FK_Receipts_Organizations_OrganizationId",
                table: "Receipts",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Receipts_Organizations_OrganizationId",
                table: "Receipts");

            migrationBuilder.DropIndex(
                name: "IX_Receipts_OrganizationId",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "Receipts");
        }
    }
}
