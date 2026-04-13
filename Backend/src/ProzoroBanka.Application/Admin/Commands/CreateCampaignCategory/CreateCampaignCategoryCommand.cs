using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Commands.CreateCampaignCategory;

public record CreateCampaignCategoryCommand(
	string NameUk,
	string NameEn,
	string Slug,
	int SortOrder,
	bool IsActive) : IRequest<ServiceResponse<AdminCampaignCategoryDto>>;

public class CreateCampaignCategoryCommandValidator : AbstractValidator<CreateCampaignCategoryCommand>
{
	public CreateCampaignCategoryCommandValidator()
	{
		RuleFor(x => x.NameUk).NotEmpty().MaximumLength(160);
		RuleFor(x => x.NameEn).NotEmpty().MaximumLength(160);
		RuleFor(x => x.Slug).NotEmpty().MaximumLength(180).Matches("^[a-z0-9]+(?:-[a-z0-9]+)*$");
	}
}
