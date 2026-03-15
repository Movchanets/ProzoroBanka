using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;

namespace ProzoroBanka.Application.Organizations.Queries.GetMyInvitations;

public record GetMyInvitationsQuery(
	Guid CallerDomainUserId) : IRequest<ServiceResponse<IReadOnlyList<InvitationDto>>>;
