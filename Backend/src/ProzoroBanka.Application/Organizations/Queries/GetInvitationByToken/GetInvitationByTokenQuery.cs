using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;

namespace ProzoroBanka.Application.Organizations.Queries.GetInvitationByToken;

public record GetInvitationByTokenQuery(
	string Token) : IRequest<ServiceResponse<InvitationDto>>;
