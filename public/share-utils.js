export function buildShareUrl(baseHref, text, answer = 'yes') {
  const url = new URL(baseHref);

  url.pathname = `/${answer}`;
  url.search = '';
  url.searchParams.set('request', text);
  return url.href;
}

export function buildShareText(text, answer = 'yes') {
  const verb = answer === 'no' ? 'no' : 'yes';
  return `YorNaaS says ${verb} to: ${text}`;
}

export function buildSocialShareLinks(baseHref, text, answer = 'yes') {
  const url = buildShareUrl(baseHref, text, answer);
  const shareText = buildShareText(text, answer);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);
  const encodedEmailBody = encodeURIComponent(`${shareText}\n\n${url}`);

  return {
    url,
    x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodeURIComponent('YorNaaS link')}&body=${encodedEmailBody}`,
    whatsApp: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`
  };
}
