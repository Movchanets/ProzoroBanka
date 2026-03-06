using System.Reflection;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using ProzoroBanka.Application.Common.Behaviors;

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

		return services;
	}
}
