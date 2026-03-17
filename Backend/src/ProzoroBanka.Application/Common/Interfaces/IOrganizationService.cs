using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;

namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Service for organization management operations.
/// </summary>
public interface IOrganizationService
{
	/// <summary>Create new organization with owner member.</summary>
	Task<ServiceResponse<OrganizationDto>> CreateAsync(
		Guid callerUserId,
		string name,
		string? description,
		string? website,
		string? contactEmail,
		CancellationToken cancellationToken = default);

	/// <summary>Get organization by ID (with member access check).</summary>
	Task<ServiceResponse<OrganizationDto>> GetByIdAsync(
		Guid organizationId,
		Guid callerUserId,
		CancellationToken cancellationToken = default);

	/// <summary>Get all organizations for logged-in user.</summary>
	Task<ServiceResponse<IReadOnlyList<OrganizationDto>>> GetUserOrganizationsAsync(
		Guid userId,
		CancellationToken cancellationToken = default);

	/// <summary>Update organization details.</summary>
	Task<ServiceResponse<OrganizationDto>> UpdateAsync(
		Guid organizationId,
		Guid callerUserId,
		string? name,
		string? description,
		string? website,
		string? contactEmail,
		CancellationToken cancellationToken = default);

	/// <summary>Upload and set organization logo.</summary>
	Task<ServiceResponse<OrganizationDto>> UploadLogoAsync(
		Guid organizationId,
		Guid callerUserId,
		Stream fileStream,
		string fileName,
		string contentType,
		CancellationToken cancellationToken = default);

	/// <summary>Get organization members.</summary>
	Task<ServiceResponse<IReadOnlyList<OrganizationMemberDto>>> GetMembersAsync(
		Guid organizationId,
		Guid callerUserId,
		CancellationToken cancellationToken = default);

	/// <summary>Update member role and permissions.</summary>
	Task<ServiceResponse> UpdateMemberRoleAsync(
		Guid organizationId,
		Guid memberId,
		Guid callerUserId,
		int role,
		int permissions,
		CancellationToken cancellationToken = default);

	/// <summary>Remove member from organization.</summary>
	Task<ServiceResponse> RemoveMemberAsync(
		Guid organizationId,
		Guid memberId,
		Guid callerUserId,
		CancellationToken cancellationToken = default);

	/// <summary>Leave organization (user removes themselves).</summary>
	Task<ServiceResponse> LeaveAsync(
		Guid organizationId,
		Guid userId,
		CancellationToken cancellationToken = default);

	/// <summary>Delete organization (soft delete).</summary>
	Task<ServiceResponse> DeleteAsync(
		Guid organizationId,
		Guid callerUserId,
		CancellationToken cancellationToken = default);
}
