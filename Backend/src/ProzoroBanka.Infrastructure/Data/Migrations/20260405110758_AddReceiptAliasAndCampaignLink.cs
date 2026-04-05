using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProzoroBanka.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReceiptAliasAndCampaignLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Alias",
                table: "Receipts",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CampaignId",
                table: "Receipts",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_CampaignId",
                table: "Receipts",
                column: "CampaignId");

            migrationBuilder.AddForeignKey(
                name: "FK_Receipts_Campaigns_CampaignId",
                table: "Receipts",
                column: "CampaignId",
                principalTable: "Campaigns",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Receipts_Campaigns_CampaignId",
                table: "Receipts");

            migrationBuilder.DropIndex(
                name: "IX_Receipts_CampaignId",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "Alias",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "CampaignId",
                table: "Receipts");
        }
    }
}
