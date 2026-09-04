// Vercel Serverless Function: フォーム送信をResend経由でメール送信する。
//
// 必須の環境変数(Vercelプロジェクト設定 > Environment Variables で設定):
//   RESEND_API_KEY    - Resendのアカウント設定(https://resend.com/api-keys)で発行したAPIキー
// 任意の環境変数(未設定時は下記デフォルト値を使用):
//   RESEND_FROM_EMAIL - 送信元アドレス(Resendで検証済みの独自ドメインを推奨)。
//                        未設定時はResendの共有テスト送信元 onboarding@resend.dev を使用。
//   CONTACT_TO_EMAIL  - 問い合わせの届け先アドレス。未設定時は whitephat7@gmail.com。

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { company, fullname, email, message, _hp } = req.body || {};

  // ハニーポット: ボットが入力しがちな隠しフィールド。人間には送信されない想定。
  if (_hp) {
    return res.status(200).json({ success: true });
  }

  if (!company || !fullname || !email || !message) {
    return res.status(400).json({ error: '必須項目が入力されていません。' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set.');
    return res.status(500).json({ error: 'サーバー設定エラーが発生しました。' });
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const toEmail = process.env.CONTACT_TO_EMAIL || 'whitephat7@gmail.com';

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `WPG LP 無料デザイン診断 <${fromEmail}>`,
        to: [toEmail],
        reply_to: email,
        subject: `【無料デザイン診断】${company} 様よりお問い合わせ`,
        text: [
          `会社名: ${company}`,
          `ご担当者様氏名: ${fullname}`,
          `メールアドレス: ${email}`,
          '',
          '現在のお悩み・ご要望:',
          message,
        ].join('\n'),
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend API error:', resendRes.status, errText);
      return res.status(502).json({ error: '送信に失敗しました。時間をおいて再度お試しください。' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'サーバーエラーが発生しました。' });
  }
};
