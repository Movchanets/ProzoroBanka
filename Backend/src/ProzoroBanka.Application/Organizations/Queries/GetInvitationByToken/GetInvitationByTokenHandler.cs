using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Application.Organizations.InvitationSupport;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Domain.Interfaces;

namespace ProzoroBanka.Application.Organizations.Queries.GetInvitationByToken;

public class GetInvitationByTokenHandler
	: IRequestHandler<GetInvitationByTokenQuery, ServiceResponse<InvitationDto>>
{
	private readonly IInvitationRepository _invitationRepository;
	private readonly IFileStorage _fileStorage;

	public GetInvitationByTokenHandler(IInvitationRepository invitationRepository, IFileStorage fileStorage)
	{
		_invitationRepository = invitationRepository;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<InvitationDto>> Handle(
		GetInvitationByTokenQuery request, CancellationToken cancellationToken)
	{
		var invitation = await _invitationRepository.GetByTokenAsync(request.Token, cancellationToken);

		if (invitation is null)
			return ServiceResponse<InvitationDto>.Failure("Запрошення не знайдено");

		if (invitation.Status == InvitationStatus.Expired ||
			(invitation.Status == InvitationStatus.Pending && InvitationRules.IsExpired(invitation, DateTime.UtcNow)))
			return ServiceResponse<InvitationDto>.Failure("Термін дії запрошення закінчився");

		if (invitation.Status is InvitationStatus.Cancelled)
			return ServiceResponse<InvitationDto>.Failure("Запрошення скасовано");

		return ServiceResponse<InvitationDto>.Success(
			InvitationDtoFactory.Create(invitation, _fileStorage, includeEmail: false, includeToken: false));
	}
}
