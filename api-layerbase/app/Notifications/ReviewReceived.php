<?php

namespace App\Notifications;

use App\Models\Review;
use Illuminate\Notifications\Notification;

/** Al autor: alguien ha valorado uno de sus componentes. */
class ReviewReceived extends Notification
{
    public function __construct(private readonly Review $review) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'review_received',
            'component_slug' => $this->review->component->slug,
            'component_title' => $this->review->component->title,
            'rating' => $this->review->rating,
            'reviewer_name' => $this->review->author?->name,
        ];
    }
}
