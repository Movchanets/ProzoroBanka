namespace ProzoroBanka.Application.Contracts.Email;

public interface IEmailNotificationService
{
	Task SendEmailAsync(ISendEmailCommand command, CancellationToken cancellationToken = default);
	Task SendTemplatedEmailAsync(string templateName, string to, object templateData, CancellationToken cancellationToken = default);
	Task ScheduleEmailAsync(ISendEmailCommand command, DateTime scheduledTime, CancellationToken cancellationToken = default);
}

public static class EmailTemplates
{
	public const string PasswordReset = "PasswordReset";
}