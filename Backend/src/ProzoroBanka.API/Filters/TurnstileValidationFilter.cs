using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.API.Filters;

public sealed class TurnstileValidationFilter : IAsyncActionFilter
{
	private readonly ITurnstileService _turnstileValidator;
	private readonly ILogger<TurnstileValidationFilter> _logger;

	public TurnstileValidationFilter(
		ITurnstileService turnstileValidator,
		ILogger<TurnstileValidationFilter> logger)
	{
		_turnstileValidator = turnstileValidator;
		_logger = logger;
	}

	public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
	{
		try
		{
			var (hasTurnstileToken, token) = ExtractTokenFromArguments(context);
			if (!hasTurnstileToken)
			{
				await next();
				return;
			}

			if (string.IsNullOrWhiteSpace(token))
			{
				context.Result = new BadRequestObjectResult(new { Error = "Turnstile верифікація обов'язкова" });
				return;
			}

			var remoteIp = context.HttpContext.Connection.RemoteIpAddress?.ToString();
			var isValid = await _turnstileValidator.ValidateAsync(token, remoteIp, context.HttpContext.RequestAborted);

			if (!isValid)
			{
				_logger.LogWarning("Turnstile validation failed for {Path}", context.HttpContext.Request.Path);
				context.Result = new BadRequestObjectResult(new { Error = "Помилка перевірки CAPTCHA. Спробуйте ще раз." });
				return;
			}

			await next();
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Unexpected Turnstile validation error for {Path}", context.HttpContext.Request.Path);
			context.Result = new ObjectResult(new { Error = "Не вдалося виконати перевірку CAPTCHA." })
			{
				StatusCode = StatusCodes.Status500InternalServerError
			};
		}
	}

	private static (bool HasTurnstileToken, string? Token) ExtractTokenFromArguments(ActionExecutingContext context)
	{
		foreach (var (key, value) in context.ActionArguments)
		{
			if (value is null)
				continue;

			if (value is string text && string.Equals(key, "turnstileToken", StringComparison.OrdinalIgnoreCase))
				return (true, text);

			var property = value.GetType().GetProperty(
				"TurnstileToken",
				BindingFlags.Instance | BindingFlags.Public | BindingFlags.IgnoreCase);

			if (property?.PropertyType != typeof(string))
				continue;

			return (true, property.GetValue(value) as string);
		}

		return (false, null);
	}
}