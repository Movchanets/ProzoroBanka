using System.Reflection;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using ProzoroBanka.Application.Common.Behaviors;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Services;

namespace ProzoroBanka.Application;

public static class DependencyInjection
{
	public static IServiceCollection AddApplication(this IServiceCollection services)
	{
		var assembly = Assembly.GetExecutingAssembly();

		// MediatR + pipeline behaviors
		services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));
		services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

		// FluentValidation — автоматична реєстрація всіх валідаторів
		services.AddValidatorsFromAssembly(assembly);

		// AutoMapper
		services.AddAutoMapper(assembly);

		// Organization authorization service
		services.AddScoped<IOrganizationAuthorizationService, OrganizationAuthorizationService>();

		return services;
	}
}
