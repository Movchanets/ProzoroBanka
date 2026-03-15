using System.Text.RegularExpressions;

namespace ProzoroBanka.Application.Organizations;

internal static class SlugHelper
{
	private static readonly Regex WhitespaceRegex = new(@"[\s_]+", RegexOptions.Compiled);
	private static readonly Regex NonAlphanumericRegex = new(@"[^a-z0-9\-]", RegexOptions.Compiled);
	private static readonly Regex MultipleHyphensRegex = new(@"-+", RegexOptions.Compiled);

	public static string Generate(string name)
	{
		if (string.IsNullOrWhiteSpace(name))
			return "organization";

		var slug = name.Trim().ToLowerInvariant();
		slug = WhitespaceRegex.Replace(slug, "-");
		slug = NonAlphanumericRegex.Replace(slug, "");
		slug = MultipleHyphensRegex.Replace(slug, "-").Trim('-');

		if (string.IsNullOrEmpty(slug))
			slug = "organization";

		return slug.Length > 100 ? slug[..100] : slug;
	}
}
