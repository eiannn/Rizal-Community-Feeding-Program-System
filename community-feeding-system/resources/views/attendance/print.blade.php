<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title></title>
    <style>
        @page { size: landscape; margin: 1in; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0; background: #ffffff; }
        .document-header { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #166534; padding-bottom: 14px; margin-bottom: 14px; }
        .brand-mark { width: 58px; height: 58px; border-radius: 999px; border: 1px solid #bbf7d0; background: #ffffff; display: grid; place-items: center; overflow: hidden; }
        .brand-mark img { width: 100%; height: 100%; object-fit: cover; }
        .eyebrow { margin: 0 0 4px; color: #166534; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em; }
        h1 { margin: 0; font-size: 21px; line-height: 1.2; }
        .system-name { margin: 5px 0 0; color: #475569; font-size: 12px; }
        .meta-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 14px 0 18px; }
        .meta-grid div { border: 1px solid #dbe4ee; background: #f8fafc; padding: 8px 10px; min-height: 46px; }
        .meta-grid span { display: block; color: #64748b; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; }
        .meta-grid strong { display: block; margin-top: 4px; color: #0f172a; font-size: 12px; line-height: 1.35; }
        table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 7px; text-align: left; vertical-align: top; line-height: 1.3; }
        th { background: #ecfdf5; color: #166534; font-weight: 800; }
        .signature-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 36px; margin-top: 96px; page-break-inside: avoid; }
        .signature-line { border-top: 1px solid #0f172a; padding-top: 6px; text-align: center; font-size: 11px; color: #334155; }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .document-header, .meta-grid div { break-inside: avoid; }
        }
    </style>
</head>
<body>
    @php
        $formatPrintTime = function ($value) {
            if (blank($value)) {
                return '--:--';
            }

            try {
                return \Carbon\Carbon::parse($value)->format('g:i A');
            } catch (\Throwable $exception) {
                return (string) $value;
            }
        };
    @endphp

    <header class="document-header">
        <div class="brand-mark"><img src="/images/system-logo.png" alt="System logo"></div>
        <div>
            <p class="eyebrow">Official Program Record</p>
            <h1>Barangay Community Feeding Attendance Report</h1>
            <p class="system-name">Community Feeding Program Monitoring System in Barangay Rizal Bansalan</p>
        </div>
    </header>

    <section class="meta-grid">
        <div><span>Schedule</span><strong>{{ $schedule->title }} ({{ $schedule->session_type ?? 'Regular' }})</strong></div>
        <div><span>Date</span><strong>{{ $attendanceDate }}</strong></div>
        <div><span>Schedule Time</span><strong>{{ $formatPrintTime($schedule->start_time) }} - {{ $formatPrintTime($schedule->end_time) }}</strong></div>
        <div><span>Area</span><strong>{{ $schedule->location ?? 'N/A' }}</strong></div>
        <div><span>Record Count</span><strong>{{ $rows->count() }}</strong></div>
    </section>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Time Recorded</th>
                <th>Beneficiary ID</th>
                <th>Child Name</th>
                <th>Guardian Name</th>
                <th>Barangay/Area</th>
                <th>Attendance Status</th>
                <th>Remarks</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($rows as $row)
                <tr>
                    <td>{{ $row->attendance_date }}</td>
                    <td>{{ $row->attendance_time ? $formatPrintTime($row->attendance_time) : optional($row->recorded_at)->format('g:i A') }}</td>
                    <td>{{ $row->beneficiary?->beneficiary_code }}</td>
                    <td>{{ trim(($row->beneficiary?->first_name ?? '') . ' ' . ($row->beneficiary?->last_name ?? '')) }}</td>
                    <td>{{ $row->beneficiary?->guardian_name }}</td>
                    <td>{{ $row->beneficiary?->purok?->purok_name }}</td>
                    <td>{{ $row->attendance_status }}</td>
                    <td>{{ $row->remarks }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
    <section class="signature-grid">
        <div class="signature-line">Prepared by</div>
        <div class="signature-line">Reviewed / Approved by</div>
    </section>
</body>
@if (request()->boolean('autoprint'))
<script>
    window.addEventListener('load', function () {
        window.print();
    });
</script>
@endif
</html>
