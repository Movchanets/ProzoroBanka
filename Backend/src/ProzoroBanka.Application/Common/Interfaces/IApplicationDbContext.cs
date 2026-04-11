using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Абстракція DbContext для Application layer (без Infrastructure-залежностей).
/// </summary>
public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<SystemSetting> SystemSettings { get; }
    DbSet<Organization> Organizations { get; }
    DbSet<OrganizationMember> OrganizationMembers { get; }
    DbSet<OrganizationStateRegistryCredential> OrganizationStateRegistryCredentials { get; }
    DbSet<Invitation> Invitations { get; }
    DbSet<Receipt> Receipts { get; }
    DbSet<ReceiptItem> ReceiptItems { get; }
    DbSet<ReceiptItemPhoto> ReceiptItemPhotos { get; }
    DbSet<MonobankTransaction> MonobankTransactions { get; }
    DbSet<MatchResult> MatchResults { get; }
    DbSet<Campaign> Campaigns { get; }
    DbSet<CampaignTransaction> CampaignTransactions { get; }
    DbSet<CampaignPhoto> CampaignPhotos { get; }
    DbSet<OcrModelConfig> OcrModelConfigs { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}

