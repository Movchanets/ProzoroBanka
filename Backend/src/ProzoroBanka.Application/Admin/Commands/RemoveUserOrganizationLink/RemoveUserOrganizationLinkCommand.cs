using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Commands.RemoveUserOrganizationLink;

public record RemoveUserOrganizationLinkCommand(
	Guid UserId,
	Guid OrganizationId) : IRequest<ServiceResponse>;

public class RemoveUserOrganizationLinkCommandValidator : AbstractValidator<RemoveUserOrganizationLinkCommand>
{
	public RemoveUserOrganizationLinkCommandValidator()
	{
		RuleFor(x => x.UserId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();
	}
}

public class RemoveUserOrganizationLinkCommandHandler : IRequestHandler<RemoveUserOrganizationLinkCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;

	public RemoveUserOrganizationLinkCommandHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse> Handle(RemoveUserOrganizationLinkCommand request, CancellationToken cancellationToken)
	{
		var user = await _db.Users
			.FirstOrDefaultAsync(entity => entity.IdentityUserId == request.UserId, cancellationToken);

		if (user is null)
			return ServiceResponse.Failure("Користувача не знайдено");

		var membership = await _db.OrganizationMembers
			.Include(entity => entity.Organization)
			.FirstOrDefaultAsync(
				entity => entity.OrganizationId == request.OrganizationId && entity.UserId == user.Id,
				cancellationToken);

		if (membership is null)
			return ServiceResponse.Failure("Зв'язок користувача з організацією не знайдено");

		if (membership.Organization.OwnerUserId == user.Id)
			return ServiceResponse.Failure("Неможливо видалити зв'язок власника організації");

		membership.IsDeleted = true;
		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse.Success("Зв'язок користувача з організацією видалено");
	}
}
