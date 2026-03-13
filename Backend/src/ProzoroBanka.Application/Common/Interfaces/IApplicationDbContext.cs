using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Абстракція DbContext для Application layer (без Infrastructure-залежностей).
/// </summary>
public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Organization> Organizations { get; }
    DbSet<OrganizationMember> OrganizationMembers { get; }
    DbSet<Invitation> Invitations { get; }
    DbSet<Receipt> Receipts { get; }
    DbSet<MonobankTransaction> MonobankTransactions { get; }
    DbSet<MatchResult> MatchResults { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
