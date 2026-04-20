using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProzoroBanka.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveBankReceiptLegacyFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SenderIbanOrCard",
                table: "CampaignDocuments");

            migrationBuilder.DropColumn(
                name: "TotalItemsAmount",
                table: "CampaignDocuments");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SenderIbanOrCard",
                table: "CampaignDocuments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "TotalItemsAmount",
                table: "CampaignDocuments",
                type: "bigint",
                nullable: true);
        }
    }
}
