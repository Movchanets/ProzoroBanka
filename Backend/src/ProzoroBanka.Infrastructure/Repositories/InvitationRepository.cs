using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Domain.Interfaces;

namespace ProzoroBanka.Infrastructure.Repositories;

public class InvitationRepository : IInvitationRepository
{
	private readonly IApplicationDbContext _db;

	public InvitationRepository(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<Invitation?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
	{
		return await _db.Invitations
			.AsNoTracking()
			.FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted, cancellationToken);
	}

	public async Task<Invitation?> GetByTokenAsync(string token, CancellationToken cancellationToken = default)
	{
		return await _db.Invitations
			.AsNoTracking()
			.Include(i => i.Organization)
			.Include(i => i.Inviter)
			.FirstOrDefaultAsync(i => i.Token == token && !i.IsDeleted, cancellationToken);
	}

	public async Task<Invitation?> GetTrackedByTokenAsync(string token, CancellationToken cancellationToken = default)
	{
		return await _db.Invitations
			.Include(i => i.Organization)
			.Include(i => i.Inviter)
			.FirstOrDefaultAsync(i => i.Token == token && !i.IsDeleted, cancellationToken);
	}

	public async Task<IReadOnlyList<Invitation>> GetPendingForEmailAsync(string email, CancellationToken cancellationToken = default)
	{
		email = email.ToLowerInvariant();

		return await _db.Invitations
			.AsNoTracking()
			.Include(i => i.Organization)
			.Include(i => i.Inviter)
			.Where(i =>
				i.Email == email &&
				i.Status == InvitationStatus.Pending &&
				i.ExpiresAt > DateTime.UtcNow &&
				!i.IsDeleted)
			.OrderByDescending(i => i.CreatedAt)
			.ToListAsync(cancellationToken);
	}

	public async Task<IReadOnlyList<Invitation>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default)
	{
		return await _db.Invitations
			.AsNoTracking()
			.Include(i => i.Organization)
			.Include(i => i.Inviter)
			.Where(i => i.OrganizationId == organizationId && !i.IsDeleted)
			.OrderByDescending(i => i.CreatedAt)
			.ToListAsync(cancellationToken);
	}

	public async Task<bool> HasPendingEmailInviteAsync(Guid organizationId, string email, CancellationToken cancellationToken = default)
	{
		email = email.ToLowerInvariant();

		return await _db.Invitations
			.AnyAsync(i =>
				i.OrganizationId == organizationId &&
				i.Email == email &&
				i.Status == InvitationStatus.Pending &&
				i.ExpiresAt > DateTime.UtcNow &&
				!i.IsDeleted,
				cancellationToken);
	}

	public void Add(Invitation invitation)
	{
		_db.Invitations.Add(invitation);
	}

	public void Update(Invitation invitation)
	{
		_db.Invitations.Update(invitation);
	}

	public void Delete(Invitation invitation)
	{
		invitation.IsDeleted = true;
		_db.Invitations.Update(invitation);
	}
}
