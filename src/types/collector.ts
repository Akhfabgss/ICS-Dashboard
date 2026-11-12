export interface CollectorRecord {
    id: string;
    user_id?: string | null;
    username: string;
    display_name: string;
    whatsapp_no?: string | null;
    location: string;
    bio: string;
    avatar_bg: string;
    manual_points: number;
    sets_completed: number;
    badge: string;
    join_date: string;
    created_at: string;

    // Computed / Aggregated Fields (dari card_registry & ranking)
    card_points: number;
    total_points: number;
    total_slabs: number;
    gem_mint_count: number;
    gem_mint_ratio: number;
    rank: number;
}

export const AVATAR_BG_OPTIONS = [
    { label: "Indigo Purple", value: "from-indigo-500 to-purple-600" },
    { label: "Emerald Teal", value: "from-emerald-500 to-teal-600" },
    { label: "Amber Orange", value: "from-amber-500 to-orange-600" },
    { label: "Rose Pink", value: "from-rose-500 to-pink-600" },
    { label: "Cyan Blue", value: "from-cyan-500 to-blue-600" },
    { label: "Gold Royal", value: "from-yellow-500 to-amber-600" },
    { label: "Slate Onyx", value: "from-slate-600 to-gray-800" },
];

export const COLLECTOR_BADGES = [
    {
        name: "Rookie Collector",
        minPoints: 0,
        style: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    },
    {
        name: "Bronze Collector",
        minPoints: 500,
        style: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800",
    },
    {
        name: "Silver Collector",
        minPoints: 1500,
        style: "bg-zinc-200 text-zinc-800 border-zinc-400 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600",
    },
    {
        name: "Gold Elite",
        minPoints: 5000,
        style: "bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700",
    },
    {
        name: "Mythic Master",
        minPoints: 10000,
        style: "bg-purple-100 text-purple-800 border-purple-400 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700",
    },
];

// Rekomendasi badge otomatis berdasarkan total points
export function getRecommendedBadge(totalPoints: number): string {
    if (totalPoints >= 10000) return "Mythic Master";
    if (totalPoints >= 5000) return "Gold Elite";
    if (totalPoints >= 1500) return "Silver Collector";
    if (totalPoints >= 500) return "Bronze Collector";
    return "Rookie Collector";
}

export function getBadgeStyle(badgeName: string): string {
    const found = COLLECTOR_BADGES.find((b) => b.name.toLowerCase() === badgeName?.toLowerCase());
    return found ? found.style : COLLECTOR_BADGES[0].style;
}