import type {
  Category,
  Church,
  Liturgy,
  MusicGroup,
  Setlist,
  Song,
  SystemUser,
  WorshipSchedule,
} from '../types';

export function downloadJsonBackup(payload: {
  songs: Song[];
  categories: Category[];
  churches: Church[];
  musicGroups: MusicGroup[];
  setlists: Setlist[];
  schedules: WorshipSchedule[];
  liturgies: Liturgy[];
  systemUsers: SystemUser[];
}) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          appName: 'LouvorHub Backup',
          exportedAt: new Date().toISOString(),
          ...payload,
        },
        null,
        2,
      ),
    ],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `louvorhub-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
