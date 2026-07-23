<?php

namespace App\Http\Controllers;

use App\Models\Beneficiary;
use App\Models\Purok;
use Illuminate\Http\Request;

class BeneficiaryController extends Controller
{
    public function index()
    {
        $beneficiaries = Beneficiary::with('purok')->latest()->paginate(10);
        return view('beneficiaries.index', compact('beneficiaries'));
    }

    public function create()
    {
        $puroks = Purok::orderBy('purok_name')->get();
        return view('beneficiaries.create', compact('puroks'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'beneficiary_code' => 'required|string|max:255|unique:beneficiaries,beneficiary_code',
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'sex' => 'required|in:Male,Female',
            'birth_date' => 'required|date',
            'guardian_name' => 'required|string|max:255',
            'guardian_contact' => 'nullable|string|max:255',
            'address' => 'required|string',
            'purok_id' => 'required|exists:puroks,id',
            'status' => 'required|in:Active,Inactive,Completed',
        ]);

        Beneficiary::create($request->all());

        return redirect()->route('beneficiaries.index')
            ->with('success', 'Beneficiary added successfully.');
    }

    public function show(Beneficiary $beneficiary)
    {
        $beneficiary->load('purok', 'attendances', 'nutritionRecords');
        return view('beneficiaries.show', compact('beneficiary'));
    }

    public function edit(Beneficiary $beneficiary)
    {
        $puroks = Purok::orderBy('purok_name')->get();
        return view('beneficiaries.edit', compact('beneficiary', 'puroks'));
    }

    public function update(Request $request, Beneficiary $beneficiary)
    {
        $request->validate([
            'beneficiary_code' => 'required|string|max:255|unique:beneficiaries,beneficiary_code,' . $beneficiary->id,
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'sex' => 'required|in:Male,Female',
            'birth_date' => 'required|date',
            'guardian_name' => 'required|string|max:255',
            'guardian_contact' => 'nullable|string|max:255',
            'address' => 'required|string',
            'purok_id' => 'required|exists:puroks,id',
            'status' => 'required|in:Active,Inactive,Completed',
        ]);

        $beneficiary->update($request->all());

        return redirect()->route('beneficiaries.index')
            ->with('success', 'Beneficiary updated successfully.');
    }

    public function destroy(Beneficiary $beneficiary)
    {
        $beneficiary->delete();

        return redirect()->route('beneficiaries.index')
            ->with('success', 'Beneficiary deleted successfully.');
    }
}