using MediatR;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Queries.GetOrganizationCampaigns;

public record GetAdminOrganizationCampaignsQuery(
	Guid OrganizationId,
	int Page,
	int PageSize) : IRequest<ServiceResponse<IReadOnlyList<AdminCampaignDto>>>;
