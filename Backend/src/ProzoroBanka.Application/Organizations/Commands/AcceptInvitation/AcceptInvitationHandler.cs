using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.InvitationSupport;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.AcceptInvitation;

public class AcceptInvitationHandler : IRequestHandler<AcceptInvitationCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;
	private readonly IUnitOfWork _unitOfWork;
	private readonly OrganizationPlansOptions _plansOptions;

	public AcceptInvitationHandler(IApplicationDbContext db, IUnitOfWork unitOfWork, IOptions<OrganizationPlansOptions> plansOptions)
	{
		_db = db;
		_unitOfWork = unitOfWork;
		_plansOptions = plansOptions.Value;
	}

	public async Task<ServiceResponse> Handle(
		AcceptInvitationCommand request, CancellationToken cancellationToken)
	{
		await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);

		var invitation = await _db.Invitations
			.FirstOrDefaultAsync(i => i.Token == request.Token && !i.IsDeleted, cancellationToken);

		if (invitation is null)
		{
			await transaction.RollbackAsync(cancellationToken);
			return ServiceResponse.Failure("Запрошення не знайдено");
		}

		if (invitation.Status != InvitationStatus.Pending)
		{
			await transaction.RollbackAsync(cancellationToken);
			return ServiceResponse.Failure(InvitationRules.GetInactiveMessage(invitation.Status));
		}

		if (InvitationRules.IsExpired(invitation, DateTime.UtcNow))
		{
			invitation.Status = InvitationStatus.Expired;
			await _db.SaveChangesAsync(cancellationToken);
			await transaction.CommitAsync(cancellationToken);
			return ServiceResponse.Failure("Термін дії запрошення закінчився");
		}

		// For email-based invitations, verify the caller's email matches
		if (invitation.Email is not null)
		{
			var callerUser = await _db.Users
				.AsNoTracking()
				.FirstOrDefaultAsync(u => u.Id == request.CallerDomainUserId, cancellationToken);

			if (callerUser is null)
			{
				await transaction.RollbackAsync(cancellationToken);
				return ServiceResponse.Failure("Користувача не знайдено");
			}

			if (!string.Equals(callerUser.Email, invitation.Email, StringComparison.OrdinalIgnoreCase))
			{
				await transaction.RollbackAsync(cancellationToken);
				return ServiceResponse.Failure("Це запрошення призначено для іншого email");
			}
		}

		// Check if already a member
		var alreadyMember = await _db.OrganizationMembers
			.AnyAsync(
				m => m.OrganizationId == invitation.OrganizationId &&
					 m.UserId == request.CallerDomainUserId &&
					 !m.IsDeleted,
				cancellationToken);

		if (alreadyMember)
		{
			await transaction.RollbackAsync(cancellationToken);
			return ServiceResponse.Failure("Ви вже є учасником цієї організації");
		}

		var organizationPlan = await _db.Organizations
			.AsNoTracking()
			.Where(o => o.Id == invitation.OrganizationId && !o.IsDeleted)
			.Select(o => (OrganizationPlanType?)o.PlanType)
			.FirstOrDefaultAsync(cancellationToken);

		if (organizationPlan is null)
		{
			await transaction.RollbackAsync(cancellationToken);
			return ServiceResponse.Failure("Організацію не знайдено");
		}

		var planLimits = organizationPlan == OrganizationPlanType.Paid ? _plansOptions.Paid : _plansOptions.Free;
		var activeMembersCount = await _db.OrganizationMembers
			.CountAsync(
				m => m.OrganizationId == invitation.OrganizationId &&
					 !m.IsDeleted,
				cancellationToken);

		if (activeMembersCount >= planLimits.MaxMembers)
		{
			await transaction.RollbackAsync(cancellationToken);
			return ServiceResponse.Failure("Досягнуто ліміт учасників для поточного тарифного плану");
		}

		// The conditional update prevents a second concurrent request from accepting
		// the same invitation after this handler has already validated it.
		var invitationStatusUpdated = await _db.Invitations
			.Where(i => i.Id == invitation.Id && i.Status == InvitationStatus.Pending && !i.IsDeleted)
			.ExecuteUpdateAsync(
				setters => setters
					.SetProperty(i => i.Status, InvitationStatus.Accepted)
					.SetProperty(i => i.UpdatedAt, DateTime.UtcNow),
				cancellationToken);

		if (invitationStatusUpdated == 0)
		{
			await transaction.RollbackAsync(cancellationToken);
			return ServiceResponse.Failure("Запрошення вже використано або скасовано");
		}

		invitation.Status = InvitationStatus.Accepted;

		var member = new OrganizationMember
		{
			OrganizationId = invitation.OrganizationId,
			UserId = request.CallerDomainUserId,
			Role = invitation.DefaultRole,
			PermissionsFlags = InvitationRules.GetPermissionsForRole(invitation.DefaultRole),
			JoinedAt = DateTime.UtcNow
		};

		_db.OrganizationMembers.Add(member);

		await _db.SaveChangesAsync(cancellationToken);
		await transaction.CommitAsync(cancellationToken);

		return ServiceResponse.Success();
	}
}
