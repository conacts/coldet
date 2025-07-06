import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { 
      token, 
      event, 
      timestamp, 
      userAgent, 
      isMobile, 
      timeOnPage,
      ...additionalData 
    } = await request.json();

    if (!token || !event || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: token, event, and timestamp' },
        { status: 400 }
      );
    }

    // Log the tracking event
    console.log('Tracking event:', {
      token,
      event,
      timestamp: new Date(timestamp).toISOString(),
      userAgent,
      isMobile,
      timeOnPage,
      ...additionalData,
    });

    // Here you would typically save to your database
    // For now, we'll just log it and return success
    
    // Example of what you might save to database:
    // await saveTrackingEvent({
    //   accountToken: token,
    //   eventType: event,
    //   timestamp: new Date(timestamp),
    //   userAgent,
    //   isMobile,
    //   timeOnPage,
    //   metadata: additionalData,
    // });

    // Update engagement score based on event type
    const scoreUpdate = calculateEngagementScore(event);
    
    if (scoreUpdate > 0) {
      console.log(`Engagement score +${scoreUpdate} for token ${token} (event: ${event})`);
      // Here you would update the engagement score in your database
      // await updateEngagementScore(token, scoreUpdate);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Event tracked successfully',
      scoreUpdate 
    });
  } catch (error) {
    console.error('Error tracking page visit:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}

// Calculate engagement score based on event type
// Based on the scoring algorithm from the documentation
function calculateEngagementScore(event: string): number {
  const scoreMap: Record<string, number> = {
    'payment_page_visit': 15,
    'payment_button_click': 20,
    'contact_button_click': 10,
    'payment_success_page_visit': 50,
    'receipt_download': 5,
    'payment_form_started': 20,
    'payment_form_completed': 50,
    'payment_form_abandoned': -5,
    'page_visit': 5,
    'time_on_page_high': 10, // >30 seconds
    'time_on_page_low': 0,   // <10 seconds
  };

  return scoreMap[event] || 0;
}