using MediatR;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Queries.GetAllOrganizations;

public record GetAllOrganizationsQuery(
	int Page,
	int PageSize,
	bool? VerifiedOnly = null) : IRequest<ServiceResponse<AdminOrganizationListResponse>>;
