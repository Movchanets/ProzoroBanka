using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Commands.UpdateCampaignCategory;

public record UpdateCampaignCategoryCommand(
	Guid CategoryId,
	string NameUk,
	string NameEn,
	string Slug,
	int SortOrder,
	bool IsActive) : IRequest<ServiceResponse<AdminCampaignCategoryDto>>;

public class UpdateCampaignCategoryCommandValidator : AbstractValidator<UpdateCampaignCategoryCommand>
{
	public UpdateCampaignCategoryCommandValidator()
	{
		RuleFor(x => x.CategoryId).NotEmpty();
		RuleFor(x => x.NameUk).NotEmpty().MaximumLength(160);
		RuleFor(x => x.NameEn).NotEmpty().MaximumLength(160);
		RuleFor(x => x.Slug).NotEmpty().MaximumLength(180).Matches("^[a-z0-9]+(?:-[a-z0-9]+)*$");
	}
}
