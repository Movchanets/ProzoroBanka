using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;

namespace ProzoroBanka.Application.Organizations.Queries.GetOrganizationInvitations;

public record GetOrganizationInvitationsQuery(
	Guid CallerDomainUserId,
	Guid OrganizationId) : IRequest<ServiceResponse<IReadOnlyList<InvitationDto>>>;
