import React, { useRef, useEffect, useState } from 'react';

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Professional Email Templates for Financial Services
const EMAIL_TEMPLATES = {
  loanApproval: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Loan Application Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">🎉 Congratulations!</h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your Loan Application Has Been Approved</p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Dear Valued Customer,</p>
                            <p style="color: #555555; font-size: 15px; line-height: 1.7; margin: 0 0 25px 0;">
                                We're pleased to inform you that your loan application has been <strong style="color: #667eea;">approved</strong>! 
                                Your funds will be disbursed within 24-48 hours.
                            </p>
                            <!-- Loan Details Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 18px;">Loan Details</h3>
                                        <table width="100%" cellpadding="8" cellspacing="0">
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; border-bottom: 1px solid #e0e0e0;">Loan Amount:</td>
                                                <td style="color: #333333; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #e0e0e0;">₱XX,XXX.XX</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; border-bottom: 1px solid #e0e0e0; padding-top: 12px;">Interest Rate:</td>
                                                <td style="color: #333333; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #e0e0e0; padding-top: 12px;">X.XX% per month</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; border-bottom: 1px solid #e0e0e0; padding-top: 12px;">Loan Term:</td>
                                                <td style="color: #333333; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #e0e0e0; padding-top: 12px;">XX months</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666666; font-size: 14px; padding-top: 12px;">Monthly Payment:</td>
                                                <td style="color: #667eea; font-size: 16px; font-weight: 700; text-align: right; padding-top: 12px;">₱X,XXX.XX</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">View Loan Details</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 25px 0 0 0;">
                                If you have any questions, please don't hesitate to contact our customer support team.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #999999; font-size: 13px; margin: 0 0 10px 0;">© 2025 Your Company Name. All rights reserved.</p>
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                <a href="#" style="color: #667eea; text-decoration: none;">Unsubscribe</a> | 
                                <a href="#" style="color: #667eea; text-decoration: none;">Privacy Policy</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,

  promotional: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Special Offer - Low Interest Rates</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Hero Banner -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 50px 30px; text-align: center; position: relative;">
                            <div style="background-color: #ffffff; display: inline-block; padding: 8px 20px; border-radius: 20px; margin-bottom: 20px;">
                                <span style="color: #f5576c; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Limited Time Offer</span>
                            </div>
                            <h1 style="color: #ffffff; margin: 0 0 15px 0; font-size: 32px; font-weight: 700;">Get Up To 50% OFF</h1>
                            <p style="color: #ffffff; margin: 0; font-size: 18px; opacity: 0.95;">On Your Next Personal Loan</p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello there! 👋</p>
                            <p style="color: #555555; font-size: 15px; line-height: 1.7; margin: 0 0 25px 0;">
                                We're excited to bring you our <strong style="color: #f5576c;">exclusive promotional offer</strong> – enjoy reduced interest rates 
                                and flexible payment terms on personal loans up to <strong>₱500,000</strong>!
                            </p>
                            <!-- Features Grid -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td width="50%" style="padding: 15px; vertical-align: top;">
                                        <div style="background-color: #fff5f8; border-radius: 8px; padding: 20px; text-align: center;">
                                            <div style="font-size: 32px; margin-bottom: 10px;">⚡</div>
                                            <h4 style="color: #333333; margin: 0 0 8px 0; font-size: 16px;">Fast Approval</h4>
                                            <p style="color: #666666; margin: 0; font-size: 13px;">Get approved in as fast as 30 minutes</p>
                                        </div>
                                    </td>
                                    <td width="50%" style="padding: 15px; vertical-align: top;">
                                        <div style="background-color: #fff5f8; border-radius: 8px; padding: 20px; text-align: center;">
                                            <div style="font-size: 32px; margin-bottom: 10px;">💰</div>
                                            <h4 style="color: #333333; margin: 0 0 8px 0; font-size: 16px;">Low Interest</h4>
                                            <p style="color: #666666; margin: 0; font-size: 13px;">Starting at 1.5% per month</p>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td width="50%" style="padding: 15px; vertical-align: top;">
                                        <div style="background-color: #fff5f8; border-radius: 8px; padding: 20px; text-align: center;">
                                            <div style="font-size: 32px; margin-bottom: 10px;">📱</div>
                                            <h4 style="color: #333333; margin: 0 0 8px 0; font-size: 16px;">100% Online</h4>
                                            <p style="color: #666666; margin: 0; font-size: 13px;">Apply from anywhere, anytime</p>
                                        </div>
                                    </td>
                                    <td width="50%" style="padding: 15px; vertical-align: top;">
                                        <div style="background-color: #fff5f8; border-radius: 8px; padding: 20px; text-align: center;">
                                            <div style="font-size: 32px; margin-bottom: 10px;">🎁</div>
                                            <h4 style="color: #333333; margin: 0 0 8px 0; font-size: 16px;">No Hidden Fees</h4>
                                            <p style="color: #666666; margin: 0; font-size: 13px;">Transparent pricing guaranteed</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            <!-- Countdown Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 25px; text-align: center;">
                                        <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Offer Ends In</p>
                                        <p style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">7 DAYS</p>
                                    </td>
                                </tr>
                            </table>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="#" style="display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #ffffff; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);">Apply Now →</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #999999; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
                                *Terms and conditions apply. Subject to credit approval.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #999999; font-size: 13px; margin: 0 0 10px 0;">© 2025 Your Company Name. All rights reserved.</p>
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                <a href="#" style="color: #f5576c; text-decoration: none;">Unsubscribe</a> | 
                                <a href="#" style="color: #f5576c; text-decoration: none;">Privacy Policy</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,

  newsletter: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monthly Financial Newsletter</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #1e3a8a; padding: 30px; text-align: center;">
                            <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">📰 Financial News & Updates</h2>
                            <p style="color: #93c5fd; margin: 8px 0 0 0; font-size: 14px;">Your Monthly Newsletter - January 2025</p>
                        </td>
                    </tr>
                    <!-- Introduction -->
                    <tr>
                        <td style="padding: 35px 30px 25px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Dear Valued Customer,</p>
                            <p style="color: #555555; font-size: 15px; line-height: 1.7; margin: 0;">
                                Welcome to our monthly newsletter! Stay informed about the latest updates, financial tips, 
                                and exclusive offers designed just for you.
                            </p>
                        </td>
                    </tr>
                    <!-- News Article 1 -->
                    <tr>
                        <td style="padding: 0 30px 25px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h3 style="color: #1e3a8a; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">🚀 New Digital Banking Features</h3>
                                        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">
                                            Experience banking like never before with our newly launched mobile app features including 
                                            instant transfers, bill payments, and real-time notifications.
                                        </p>
                                        <a href="#" style="color: #3b82f6; text-decoration: none; font-size: 14px; font-weight: 600;">Learn More →</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- News Article 2 -->
                    <tr>
                        <td style="padding: 0 30px 25px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h3 style="color: #065f46; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">💳 Credit Card Rewards Program</h3>
                                        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">
                                            Earn 5x points on dining, travel, and online shopping. Plus, enjoy exclusive cashback 
                                            rewards up to 20% at partner merchants nationwide.
                                        </p>
                                        <a href="#" style="color: #10b981; text-decoration: none; font-size: 14px; font-weight: 600;">View Rewards →</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- News Article 3 -->
                    <tr>
                        <td style="padding: 0 30px 25px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #f59e0b;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">📊 Financial Planning Tips</h3>
                                        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">
                                            Learn how to maximize your savings with our expert financial advisors. Free consultation 
                                            available for all premium account holders.
                                        </p>
                                        <a href="#" style="color: #f59e0b; text-decoration: none; font-size: 14px; font-weight: 600;">Book Consultation →</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Quick Stats -->
                    <tr>
                        <td style="padding: 25px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px;">
                                <tr>
                                    <td style="padding: 30px; text-align: center;">
                                        <p style="color: #ffffff; margin: 0 0 20px 0; font-size: 16px; font-weight: 600;">This Month's Highlights</p>
                                        <table width="100%" cellpadding="15" cellspacing="0">
                                            <tr>
                                                <td width="33%" style="text-align: center; border-right: 1px solid rgba(255,255,255,0.3);">
                                                    <p style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">5,000+</p>
                                                    <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 12px;">New Accounts</p>
                                                </td>
                                                <td width="34%" style="text-align: center; border-right: 1px solid rgba(255,255,255,0.3);">
                                                    <p style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">₱50M</p>
                                                    <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 12px;">Loans Disbursed</p>
                                                </td>
                                                <td width="33%" style="text-align: center;">
                                                    <p style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">98%</p>
                                                    <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 12px;">Customer Satisfaction</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 14px; margin: 0 0 15px 0;">Stay Connected</p>
                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="padding: 0 10px;"><a href="#" style="color: #1e3a8a; text-decoration: none; font-size: 24px;">📘</a></td>
                                    <td style="padding: 0 10px;"><a href="#" style="color: #1e3a8a; text-decoration: none; font-size: 24px;">🐦</a></td>
                                    <td style="padding: 0 10px;"><a href="#" style="color: #1e3a8a; text-decoration: none; font-size: 24px;">📷</a></td>
                                    <td style="padding: 0 10px;"><a href="#" style="color: #1e3a8a; text-decoration: none; font-size: 24px;">💼</a></td>
                                </tr>
                            </table>
                            <p style="color: #999999; font-size: 13px; margin: 20px 0 10px 0;">© 2025 Your Company Name. All rights reserved.</p>
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                <a href="#" style="color: #1e3a8a; text-decoration: none;">Unsubscribe</a> | 
                                <a href="#" style="color: #1e3a8a; text-decoration: none;">Privacy Policy</a> | 
                                <a href="#" style="color: #1e3a8a; text-decoration: none;">Contact Us</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,

  accountUpdate: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Important Account Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Alert Header -->
                    <tr>
                        <td style="background-color: #0891b2; padding: 35px 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 15px;">📢</div>
                            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">Important Account Update</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Dear Account Holder,</p>
                            <p style="color: #555555; font-size: 15px; line-height: 1.7; margin: 0 0 25px 0;">
                                We're writing to inform you about an important update to your account. Please review the details below 
                                and take action if necessary.
                            </p>
                            <!-- Info Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfeff; border-left: 4px solid #0891b2; border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h3 style="color: #0891b2; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">What's Changed?</h3>
                                        <ul style="color: #374151; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                            <li style="margin-bottom: 10px;">Enhanced security features have been added to your account</li>
                                            <li style="margin-bottom: 10px;">New two-factor authentication is now available (recommended)</li>
                                            <li style="margin-bottom: 10px;">Updated terms and conditions (effective February 1, 2025)</li>
                                            <li>Improved mobile banking app interface</li>
                                        </ul>
                                    </td>
                                </tr>
                            </table>
                            <!-- Action Required Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">⚠️ Action Required</h3>
                                        <p style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 0;">
                                            Please review and accept the updated terms within 30 days to continue enjoying 
                                            uninterrupted access to your account services.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <!-- Steps Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                                <tr>
                                    <td>
                                        <h3 style="color: #333333; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Next Steps:</h3>
                                    </td>
                                </tr>
                            </table>
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 25px 0;">
                                <tr>
                                    <td width="40" style="vertical-align: top; padding-top: 5px;">
                                        <div style="background-color: #0891b2; color: #ffffff; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; font-size: 16px;">1</div>
                                    </td>
                                    <td style="padding: 5px 0 15px 0;">
                                        <h4 style="color: #333333; margin: 0 0 5px 0; font-size: 15px; font-weight: 600;">Log in to your account</h4>
                                        <p style="color: #666666; margin: 0; font-size: 14px; line-height: 1.5;">Access your online banking or mobile app</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td width="40" style="vertical-align: top; padding-top: 5px;">
                                        <div style="background-color: #0891b2; color: #ffffff; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; font-size: 16px;">2</div>
                                    </td>
                                    <td style="padding: 5px 0 15px 0;">
                                        <h4 style="color: #333333; margin: 0 0 5px 0; font-size: 15px; font-weight: 600;">Review the changes</h4>
                                        <p style="color: #666666; margin: 0; font-size: 14px; line-height: 1.5;">Read through the updated information carefully</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td width="40" style="vertical-align: top; padding-top: 5px;">
                                        <div style="background-color: #0891b2; color: #ffffff; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; font-size: 16px;">3</div>
                                    </td>
                                    <td style="padding: 5px 0;">
                                        <h4 style="color: #333333; margin: 0 0 5px 0; font-size: 15px; font-weight: 600;">Accept the terms</h4>
                                        <p style="color: #666666; margin: 0; font-size: 14px; line-height: 1.5;">Click "Accept" to continue using our services</p>
                                    </td>
                                </tr>
                            </table>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="#" style="display: inline-block; background-color: #0891b2; color: #ffffff; text-decoration: none; padding: 16px 45px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);">Review & Accept Now</a>
                                    </td>
                                </tr>
                            </table>
                            <!-- Support Info -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 20px; text-align: center;">
                                        <p style="color: #666666; margin: 0 0 10px 0; font-size: 14px;">Need help? Our support team is here for you</p>
                                        <p style="color: #0891b2; margin: 0; font-size: 14px; font-weight: 600;">
                                            📞 1-800-XXX-XXXX | 📧 support@yourcompany.com
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 25px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                                <strong>Security Notice:</strong> We will never ask for your password or PIN via email. 
                                If you receive suspicious communications, please contact us immediately.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #999999; font-size: 13px; margin: 0 0 10px 0;">© 2025 Your Company Name. All rights reserved.</p>
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                <a href="#" style="color: #0891b2; text-decoration: none;">Unsubscribe</a> | 
                                <a href="#" style="color: #0891b2; text-decoration: none;">Privacy Policy</a> | 
                                <a href="#" style="color: #0891b2; text-decoration: none;">Terms of Service</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,

  loanSettlement: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FUNDLINE - Loan Settlement Amnesty Offer</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 15px;">🤝</div>
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">AMNESTY OFFER</h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Special Loan Settlement Opportunity</p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Good day Mr./Ms. <strong style="color: #10b981;">[account_name]</strong>
                            </p>
                            <p style="color: #555555; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                Greetings from your <strong style="color: #10b981;">[FUNDLINE]</strong> Family!
                            </p>
                            <p style="color: #555555; font-size: 15px; line-height: 1.7; margin: 0 0 25px 0;">
                                This email comes with well wishes for you and your loved one's health and well-being. 
                                Due to the present Economic Crisis, as well as Financial issues seriously affecting us all, 
                                <strong>[FUNDLINE]</strong> would like to extend this <strong style="color: #10b981;">AMNESTY Offer</strong> 
                                pertaining to your unpaid LOAN.
                            </p>

                            <!-- Account Information -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border-left: 4px solid #10b981; border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 17px; font-weight: 600;">📋 Your Account Details</h3>
                                        <table width="100%" cellpadding="8" cellspacing="0">
                                            <tr>
                                                <td style="color: #047857; font-size: 14px; padding: 8px 0;">Account Number:</td>
                                                <td style="color: #065f46; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">[account_number]</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #047857; font-size: 14px; padding: 8px 0;">Outstanding Balance (OSB):</td>
                                                <td style="color: #065f46; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">₱[osb]</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Acceptance Instructions -->
                            <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px; font-weight: 600;">✅ How to Accept This Offer</h3>
                            <p style="color: #555555; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                To accept this offer, kindly <strong style="color: #10b981;">REPLY to this email</strong> and include the following information:
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <ul style="color: #333333; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                            <li style="margin-bottom: 10px;"><strong>Valid ID</strong> (government-issued)</li>
                                            <li style="margin-bottom: 10px;"><strong>Active Contact Number</strong></li>
                                        </ul>
                                    </td>
                                </tr>
                            </table>

                            <!-- Payment Instructions -->
                            <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px; font-weight: 600;">💳 Payment Instructions</h3>
                            <p style="color: #555555; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                Once we receive your acceptance, you may proceed with payment through any of our <strong style="color: #10b981;">ACCREDITED CENTERS</strong>.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h4 style="color: #92400e; margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">⏰ Payment Deadline</h4>
                                        <p style="color: #78350f; font-size: 14px; margin: 0;">
                                            Payment must be made on or before: <strong style="font-size: 16px;">[due_date]</strong>
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #555555; font-size: 14px; line-height: 1.7; margin: 20px 0;">
                                <strong>Alternative Payment Options:</strong><br>
                                If you are unable to pay at our accredited centers or if the payment deadline falls on a weekend or holiday, 
                                please contact us at <strong style="color: #10b981;">[inbound_number]</strong> for assistance. We will provide alternative payment arrangements.
                            </p>

                            <!-- Certificate Processing -->
                            <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px; font-weight: 600;">📄 Certificate of Full Payment</h3>
                            <p style="color: #555555; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                After we receive your payment and it reflects in our system, the <strong style="color: #10b981;">Certificate of Full Payment</strong> 
                                will be processed within <strong>20-30 banking days</strong>. This certificate serves as official proof that your loan has been fully settled.
                            </p>

                            <!-- Important Disclaimer -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h4 style="color: #1e40af; margin: 0 0 10px 0; font-size: 15px; font-weight: 600;">⚠️ Important Reminder</h4>
                                        <p style="color: #1e3a8a; font-size: 13px; line-height: 1.7; margin: 0;">
                                            <strong>[FUNDLINE]</strong> DOES NOT require any upfront or advance payments to process this settlement offer. 
                                            Payments should only be made to our official accredited payment centers or through authorized channels. 
                                            Please be cautious of fraudulent individuals or groups claiming to represent our company.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 25px 0 0 0;">
                                Thank you for your continued trust in <strong>[FUNDLINE]</strong>. We look forward to helping you achieve 
                                financial freedom. If you have any questions or concerns, please don't hesitate to reach out to us.
                            </p>

                            <!-- Contact Info -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 20px; text-align: center;">
                                        <p style="color: #666666; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">Need Assistance?</p>
                                        <p style="color: #10b981; margin: 0; font-size: 14px;">
                                            📞 <strong>Contact Number:</strong> [inbound_number]<br>
                                            📧 <strong>Email:</strong> [YOUR_EMAIL_ADD]<br>
                                            🕐 <strong>Office Hours:</strong> Monday-Friday, 9AM-6PM
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #999999; font-size: 13px; margin: 0 0 10px 0;">© 2025 Your Company Name. All rights reserved.</p>
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                <a href="#" style="color: #10b981; text-decoration: none;">Unsubscribe</a> | 
                                <a href="#" style="color: #10b981; text-decoration: none;">Privacy Policy</a> | 
                                <a href="#" style="color: #10b981; text-decoration: none;">Terms of Service</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
};

const WysiwygEditor: React.FC<WysiwygEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = "Write your email content here..." 
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (!isHtmlMode && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || `<p>${placeholder}</p>`;
    }
    if (isHtmlMode && textareaRef.current && textareaRef.current.value !== value) {
      setHtmlContent(value || `<p>${placeholder}</p>`);
    }
  }, [value, placeholder, isHtmlMode]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Toolbar command functions
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleLinkClick = () => {
    const url = window.prompt('Enter link URL:', 'https://example.com');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const handleImageClick = () => {
    const url = window.prompt('Enter image URL:', 'https://placehold.co/600x400');
    if (url) {
      execCommand('insertImage', url);
    }
  };

  const setFontSize = (size: string) => {
    execCommand('fontSize', '3'); // Using fontSize 3 as base, then apply style
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = size;
      try {
        range.surroundContents(span);
      } catch (e) {
        span.appendChild(range.extractContents());
        range.insertNode(span);
      }
      selection.removeAllRanges();
      handleInput();
    }
  };

  const setTextColor = (color: string) => {
    execCommand('foreColor', color);
  };

  const toggleHtmlMode = () => {
    if (isHtmlMode) {
      // Switching from HTML to visual mode
      if (textareaRef.current) {
        const htmlValue = textareaRef.current.value;
        setHtmlContent(htmlValue);
        onChange(htmlValue);
        if (editorRef.current) {
          editorRef.current.innerHTML = htmlValue;
        }
      }
    } else {
      // Switching from visual to HTML mode
      if (editorRef.current) {
        const htmlValue = editorRef.current.innerHTML;
        setHtmlContent(htmlValue);
        onChange(htmlValue);
      }
    }
    setIsHtmlMode(!isHtmlMode);
  };

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const htmlValue = e.target.value;
    setHtmlContent(htmlValue);
    onChange(htmlValue);
  };

  const formatHtml = () => {
    if (textareaRef.current) {
      let html = textareaRef.current.value;
      
      // Basic HTML formatting
      html = html
        .replace(/>\s*</g, '>\n<')  // Add newlines between tags
        .replace(/^\s+|\s+$/gm, '') // Trim whitespace
        .split('\n')
        .map((line, index, arr) => {
          // Simple indentation logic
          const openTags = (line.match(/</g) || []).length;
          const closeTags = (line.match(/\//g) || []).length;
          const prevLine = arr[index - 1] || '';
          const prevOpenTags = (prevLine.match(/</g) || []).length - (prevLine.match(/\//g) || []).length;
          
          let indent = Math.max(0, prevOpenTags - (line.startsWith('</') ? 1 : 0));
          return '  '.repeat(indent) + line.trim();
        })
        .join('\n');
      
      setHtmlContent(html);
      onChange(html);
    }
  };

  const clearContent = () => {
    const emptyContent = `<p>${placeholder}</p>`;
    setHtmlContent(emptyContent);
    onChange(emptyContent);
    if (editorRef.current) {
      editorRef.current.innerHTML = emptyContent;
    }
  };

  const insertTemplate = (templateKey: keyof typeof EMAIL_TEMPLATES) => {
    const template = EMAIL_TEMPLATES[templateKey];
    setHtmlContent(template);
    onChange(template);
    if (editorRef.current) {
      editorRef.current.innerHTML = template;
    }
    setShowTemplates(false);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const clipboardData = e.clipboardData;
    const pastedText = clipboardData.getData('text/plain');
    const pastedHtml = clipboardData.getData('text/html');
    
    // If HTML content is available, use it; otherwise use plain text
    const contentToInsert = pastedHtml || pastedText;
    
    if (isHtmlMode && textareaRef.current) {
      // In HTML mode, insert at cursor position in textarea
      const textarea = textareaRef.current;
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const currentValue = textarea.value;
      const newValue = currentValue.substring(0, startPos) + contentToInsert + currentValue.substring(endPos);
      
      setHtmlContent(newValue);
      onChange(newValue);
      
      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = startPos + contentToInsert.length;
        textarea.focus();
      }, 0);
    } else if (!isHtmlMode) {
      // In visual mode, use document.execCommand to insert content
      if (pastedHtml) {
        // Insert HTML content
        document.execCommand('insertHTML', false, pastedHtml);
      } else {
        // Insert plain text
        document.execCommand('insertText', false, pastedText);
      }
      handleInput();
    }
  };

  return (
    <div className="w-full border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
      {/* Toolbar */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-600">
        <div className="flex flex-wrap items-center">
          <div className="flex items-center space-x-1 rtl:space-x-reverse flex-wrap">
            {/* Bold Button */}
            <button 
              type="button"
              onClick={() => execCommand('bold')}
              className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
              title="Bold"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5h4.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0-7H6m2 7h6.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0 0H6"/>
              </svg>
            </button>

            {/* Italic Button */}
            <button 
              type="button"
              onClick={() => execCommand('italic')}
              className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
              title="Italic"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m8.874 19 6.143-14M6 19h6.33m-.66-14H18"/>
              </svg>
            </button>

            {/* Underline Button */}
            <button 
              type="button"
              onClick={() => execCommand('underline')}
              className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
              title="Underline"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M6 19h12M8 5v9a4 4 0 0 0 8 0V5M6 5h4m4 0h4"/>
              </svg>
            </button>

            {/* Strike Button */}
            <button 
              type="button"
              onClick={() => execCommand('strikeThrough')}
              className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
              title="Strikethrough"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 6.2V5h12v1.2M7 19h6m.2-14-1.677 6.523M9.6 19l1.029-4M5 5l6.523 6.523M19 19l-7.477-7.477"/>
              </svg>
            </button>

            {/* Link Button */}
            <button 
              type="button"
              onClick={handleLinkClick}
              className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
              title="Add Link"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.213 9.787a3.391 3.391 0 0 0-4.795 0l-3.425 3.426a3.39 3.39 0 0 0 4.795 4.794l.321-.304m-.321-4.49a3.39 3.39 0 0 0 4.795 0l3.424-3.426a3.39 3.39 0 0 0-4.794-4.795l-1.028.961"/>
              </svg>
            </button>

            <div className="px-1">
              <span className="block w-px h-4 bg-gray-300 dark:bg-gray-600"></span>
            </div>

            {/* Text Alignment */}
            <button 
              type="button"
              onClick={() => execCommand('justifyLeft')}
              className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
              title="Align Left"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 6h8m-8 4h12M6 14h8m-8 4h12"/>
              </svg>
            </button>

            <button 
              type="button"
              onClick={() => execCommand('justifyCenter')}
              className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
              title="Align Center"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6h8M6 10h12M8 14h8M6 18h12"/>
              </svg>
            </button>

            <button 
              type="button"
              onClick={() => execCommand('justifyRight')}
              className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
              title="Align Right"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 6h-8m8 4H6m12 4h-8m8 4H6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Second row of buttons */}
        <div className="flex items-center gap-2 pt-2 flex-wrap">
          {/* Font Size Buttons */}
          <div className="flex gap-1">
            <button 
              type="button"
              onClick={() => setFontSize('12px')}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200"
              title="Small Text"
            >
              12px
            </button>
            <button 
              type="button"
              onClick={() => setFontSize('16px')}
              className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200"
              title="Normal Text"
            >
              16px
            </button>
            <button 
              type="button"
              onClick={() => setFontSize('20px')}
              className="px-2 py-1 text-base bg-gray-100 hover:bg-gray-200 rounded text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200"
              title="Large Text"
            >
              20px
            </button>
            <button 
              type="button"
              onClick={() => setFontSize('24px')}
              className="px-2 py-1 text-lg bg-gray-100 hover:bg-gray-200 rounded text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200"
              title="Extra Large Text"
            >
              24px
            </button>
          </div>

          <div className="px-1">
            <span className="block w-px h-4 bg-gray-300 dark:bg-gray-600"></span>
          </div>

          {/* Color Buttons */}
          <div className="flex gap-1">
            <button 
              type="button"
              onClick={() => setTextColor('#000000')}
              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
              style={{ backgroundColor: '#000000' }}
              title="Black"
            />
            <button 
              type="button"
              onClick={() => setTextColor('#FF0000')}
              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
              style={{ backgroundColor: '#FF0000' }}
              title="Red"
            />
            <button 
              type="button"
              onClick={() => setTextColor('#0000FF')}
              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
              style={{ backgroundColor: '#0000FF' }}
              title="Blue"
            />
            <button 
              type="button"
              onClick={() => setTextColor('#008000')}
              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
              style={{ backgroundColor: '#008000' }}
              title="Green"
            />
          </div>

          <div className="px-1">
            <span className="block w-px h-4 bg-gray-300 dark:bg-gray-600"></span>
          </div>

          {/* Typography Buttons */}
          <button 
            type="button"
            onClick={() => execCommand('formatBlock', 'h1')}
            className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200"
            title="Heading 1"
          >
            H1
          </button>
          <button 
            type="button"
            onClick={() => execCommand('formatBlock', 'h2')}
            className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200"
            title="Heading 2"
          >
            H2
          </button>
          <button 
            type="button"
            onClick={() => execCommand('formatBlock', 'p')}
            className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200"
            title="Paragraph"
          >
            P
          </button>

          <div className="px-1">
            <span className="block w-px h-4 bg-gray-300 dark:bg-gray-600"></span>
          </div>

          {/* List Buttons */}
          <button 
            type="button"
            onClick={() => execCommand('insertUnorderedList')}
            className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
            title="Bullet List"
          >
            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M9 8h10M9 12h10M9 16h10M4.99 8H5m-.02 4h.01m0 4H5"/>
            </svg>
          </button>

          <button 
            type="button"
            onClick={() => execCommand('insertOrderedList')}
            className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
            title="Numbered List"
          >
            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6h8m-8 6h8m-8 6h8M4 16a2 2 0 1 1 3.321 1.5L4 20h5M4 5l2-1v6m-2 0h4"/>
            </svg>
          </button>

          {/* Image Button */}
          <button 
            type="button"
            onClick={handleImageClick}
            className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
            title="Add Image"
          >
            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M13 10a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2H14a1 1 0 0 1-1-1Z" clipRule="evenodd"/>
              <path fillRule="evenodd" d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12c0 .556-.227 1.06-.593 1.422A.999.999 0 0 1 20.5 20H4a2.002 2.002 0 0 1-2-2V6Zm6.892 12 3.833-5.356-3.99-4.322a1 1 0 0 0-1.549.097L4 12.879V6h16v9.95l-3.257-3.619a1 1 0 0 0-1.557.088L11.2 18H8.892Z" clipRule="evenodd"/>
            </svg>
          </button>

          <div className="px-1">
            <span className="block w-px h-4 bg-gray-300 dark:bg-gray-600"></span>
          </div>

          {/* HTML Mode Toggle */}
          <button 
            type="button"
            onClick={toggleHtmlMode}
            className={`px-3 py-1.5 text-sm font-medium rounded text-white transition-colors ${
              isHtmlMode 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-500 hover:bg-gray-600'
            }`}
            title={isHtmlMode ? "Switch to Visual Editor" : "Switch to HTML Editor"}
          >
            {isHtmlMode ? (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Visual
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                HTML
              </span>
            )}
          </button>

          {/* HTML Mode Tools */}
          {isHtmlMode && (
            <>
              <button 
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded transition-colors font-medium"
                title="Insert Template"
              >
                📧 Templates
              </button>
              <button 
                type="button"
                onClick={formatHtml}
                className="px-2 py-1.5 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded transition-colors"
                title="Format HTML"
              >
                Format
              </button>
              <button 
                type="button"
                onClick={clearContent}
                className="px-2 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                title="Clear Content"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Template Selector */}
      {showTemplates && isHtmlMode && (
        <div className="px-4 py-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">📧 Professional Email Templates</h3>
            <button 
              onClick={() => setShowTemplates(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => insertTemplate('loanApproval')}
              className="text-left p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-purple-200 hover:border-purple-400 dark:border-purple-900 dark:hover:border-purple-600 transition-all hover:shadow-md group"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">🎉</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 mb-1">
                    Loan Approval
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Professional loan approval notification with details table
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => insertTemplate('promotional')}
              className="text-left p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-pink-200 hover:border-pink-400 dark:border-pink-900 dark:hover:border-pink-600 transition-all hover:shadow-md group"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">🎁</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-pink-600 dark:group-hover:text-pink-400 mb-1">
                    Promotional Offer
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Eye-catching promo template with features grid & countdown
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => insertTemplate('newsletter')}
              className="text-left p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-200 hover:border-blue-400 dark:border-blue-900 dark:hover:border-blue-600 transition-all hover:shadow-md group"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">📰</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-1">
                    Newsletter
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Monthly newsletter with news, updates & financial stats
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => insertTemplate('accountUpdate')}
              className="text-left p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-cyan-200 hover:border-cyan-400 dark:border-cyan-900 dark:hover:border-cyan-600 transition-all hover:shadow-md group"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">📢</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 mb-1">
                    Account Update
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Important announcement with action steps & alerts
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => insertTemplate('loanSettlement')}
              className="text-left p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-green-200 hover:border-green-400 dark:border-green-900 dark:hover:border-green-600 transition-all hover:shadow-md group"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">🤝</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-green-600 dark:group-hover:text-green-400 mb-1">
                    Loan Settlement
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Settlement offer with savings calculator & payment options
                  </p>
                </div>
              </div>
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
            💡 Click a template to insert it. You can edit the content after insertion.
          </p>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="px-4 py-2 bg-white rounded-b-lg dark:bg-gray-800">
        {!isHtmlMode ? (
          /* Visual Editor */
          <div 
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onPaste={handlePaste}
            className="block w-full px-0 text-sm text-gray-800 bg-white border-0 dark:bg-gray-800 focus:ring-0 dark:text-white dark:placeholder-gray-400 min-h-[200px] focus:outline-none"
            style={{ whiteSpace: 'pre-wrap' }}
            suppressContentEditableWarning={true}
          />
        ) : (
          /* HTML Source Editor */
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={htmlContent}
              onChange={handleHtmlChange}
              onPaste={handlePaste}
              className="block w-full px-0 text-sm text-gray-800 bg-white border-0 dark:bg-gray-800 focus:ring-0 dark:text-white dark:placeholder-gray-400 min-h-[200px] focus:outline-none font-mono resize-none"
              placeholder="Paste or edit your HTML code here..."
              style={{ whiteSpace: 'pre-wrap' }}
            />
            <div className="absolute top-2 right-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              HTML Mode
            </div>
          </div>
        )}
      </div>
      
      {/* HTML Format Help */}
      {isHtmlMode && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 rounded-b-lg">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium mb-1">HTML Mode Tips:</p>
                <ul className="space-y-1">
                  <li>• Paste formatted content from websites or email templates</li>
                  <li>• Use standard HTML tags: &lt;p&gt;, &lt;h1&gt;, &lt;strong&gt;, &lt;a href=""&gt;, &lt;img src=""&gt;</li>
                  <li>• Switch back to Visual mode to continue with toolbar formatting</li>
                </ul>
              </div>
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WysiwygEditor;
